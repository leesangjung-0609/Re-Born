const express=require("express");
const router=express.Router();
const db=require("../db/db");

const isAuthenticated=(req,res,next)=>{
  if(req.session&&req.session.user&&req.session.user.user_id){
    req.user={user_id:req.session.user.user_id};
    next();
  }else{
    return res.status(401).json({success:false,message:"로그인이 필요합니다."});
  }
};

router.post("/add",isAuthenticated,(req,res)=>{
  const reviewerId=req.user.user_id;
  const {product_id,content}=req.body;

  if(!product_id||!content){
    return res.status(400).json({success:false,message:"필수 정보 누락 (product_id, content)"});
  }

  const checkBoughtSql=`
    SELECT COUNT(*) AS count
    FROM product
    WHERE product_id=?
      AND buyer_id=?
      AND status='판매완료'`;

  db.query(checkBoughtSql,[product_id,reviewerId],(err,results)=>{
    if(err){
      console.error("구매 확인 오류:",err);
      return res.status(500).json({success:false,message:"서버 오류"});
    }
    if(results[0].count===0){
      return res.status(403).json({
        success:false,
        message:"후기는 구매 완료된 상품에 대해서만 작성할 수 있습니다."
      });
    }

    const checkReviewSql=`
      SELECT COUNT(*) AS count
      FROM review
      WHERE product_id=?
        AND user_id=?`;

    db.query(checkReviewSql,[product_id,reviewerId],(err,reviewResults)=>{
      if(err){
        console.error("중복 확인 오류:",err);
        return res.status(500).json({success:false,message:"서버 오류"});
      }
      if(reviewResults[0].count>0){
        return res.status(409).json({
          success:false,
          message:"이미 해당 상품에 대한 후기를 작성했습니다."
        });
      }

      const insertReviewSql=`
        INSERT INTO review (user_id,product_id,content)
        VALUES (?,?,?)`;

      db.query(insertReviewSql,[reviewerId,product_id,content],(err,result)=>{
        if(err){
          console.error("후기 등록 오류:",err);
          return res.status(500).json({success:false,message:"후기 등록 실패"});
        }
        res.json({success:true,message:"후기 등록 완료",reviewId:result.insertId});
      });
    });
  });
});

router.get("/received",isAuthenticated,(req,res)=>{
  const seller_id=req.user.user_id;
  const sql=`
    SELECT
      r.review_id,
      r.content,
      p.title AS product_title,
      p.product_id,
      p.image_url,
      u.username AS reviewer_name,
      r.created_at
    FROM review r
    JOIN product p ON r.product_id=p.product_id
    JOIN user u ON r.user_id=u.user_id
    WHERE p.seller_id=?
    ORDER BY r.created_at DESC`;

  db.query(sql,[seller_id],(err,results)=>{
    if(err){
      console.error("받은 후기 조회 오류:",err);
      return res.status(500).json({success:false,message:"후기 목록 조회 실패"});
    }
    res.json({success:true,reviews:results});
  });
});

router.get("/list",(req,res)=>{
  res.status(501).json({success:false,message:"엔드포인트 미구현 또는 변경됨."});
});


module.exports=router;
