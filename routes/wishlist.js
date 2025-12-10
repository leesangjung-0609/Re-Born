const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 찜 추가
router.post("/add", (req, res) => {
  const userId = req.session.user ? req.session.user.user_id : null;
  const { productId } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "로그인 필요" });
  }

  // 이미 찜했는지 확인
  const checkSql = `
    SELECT *
    FROM wishlist
    WHERE user_id = ? AND product_id = ? AND Del_yn = 0
  `;

  db.query(checkSql, [userId, productId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }

    if (results.length > 0) {
      return res.json({ message: "이미 찜한 상품입니다." });
    }

    // 찜 추가
    const insertSql = `
      INSERT INTO wishlist (user_id, product_id)
      VALUES (?, ?)
    `;

    db.query(insertSql, [userId, productId], (err2) => {
      if (err2) {
        return res.status(500).json({ error: err2 });
      }
      res.json({ message: "찜 추가 완료" });
    });
  });
});

// 찜 목록 조회
router.get("/list", (req, res) => {
  const userId = req.session.user ? req.session.user.user_id : null;

  if (!userId) {
    return res.status(401).json({ error: "로그인 필요" });
  }

  const sql = `
    SELECT
      w.wishlist_id,
      p.product_id,
      p.title,
      p.price,
      p.image_url,
      u.username AS seller_name
    FROM wishlist w
    JOIN product p ON w.product_id = p.product_id
    JOIN user u ON p.seller_id = u.user_id
    WHERE w.user_id = ? AND w.Del_yn = 0
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err });
    }
    res.json(results);
  });
});

// 찜 삭제
// 찜 삭제 (통합) - /wishlist/remove/:wishlistId (우선) 또는 /wishlist/remove (body.productId) 지원
router.delete("/remove", (req, res) => {
  const userId = req.session.user?.user_id;
  const { productId } = req.body;

  if (!userId) {
    return res.status(401).json({ message: "로그인 필요" });
  }

  const sql = `
    UPDATE wishlist
    SET Del_yn = 1
    WHERE product_id = ? AND user_id = ? AND Del_yn = 0
  `;

  db.query(sql, [productId, userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "DB 오류 발생"
      });
    }

    if (result.affectedRows === 0) {
      return res.json({
        success: false,
        message: "이미 찜 해제된 상품입니다."
      });
    }

    res.json({
      success: true,
      message: "찜 해제 완료"
    });
  });
});


// ✅ 2. wishlistId 기준 삭제 (마이페이지)
router.delete("/remove/:wishlistId", (req, res) => {
  const userId = req.session.user?.user_id;
  const { wishlistId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "로그인 필요" });
  }

  const sql = `
    UPDATE wishlist
    SET del_yn = 1
    WHERE wishlist_id = ? AND user_id = ? AND del_yn = 0
  `;

  db.query(sql, [wishlistId, userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }

    res.json({ success: result.affectedRows > 0 });
  });
});



// 찜 여부 확인
router.get("/check/:productId", (req, res) => {
  const userId = req.session.user ? req.session.user.user_id : null;
  const productId = req.params.productId;

  if (!userId) {
    return res.json({ isWished: false });
  }

  const checkSql = `
    SELECT *
    FROM wishlist
    WHERE user_id = ? AND product_id = ? AND Del_yn = 0
  `;

  db.query(checkSql, [userId, productId], (err, results) => {
    if (err) {
      console.error("찜 상태 확인 DB 오류:", err);
      return res.status(500).json({ error: "DB 오류" });
    }

    res.json({ isWished: results.length > 0 });
  });
});

module.exports = router;
