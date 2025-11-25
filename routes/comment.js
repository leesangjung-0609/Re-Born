const express = require("express");
const router = express.Router();
const db = require("../db/db");

// 📌 로그인 여부 확인 미들웨어
function isLoggedIn(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, message: "로그인이 필요합니다." });
  }
  next();
}

// 📌 댓글 작성 (리뷰 또는 상품에 대해 작성 가능)
router.post("/add", isLoggedIn, (req, res) => {
  const { review_id, product_id, content } = req.body;
  const user_id = req.session.user.user_id; // 세션에서 가져옴

  if (!content) {
    return res.status(400).json({ success: false, message: "댓글 내용을 입력하세요." });
  }

  if (!review_id && !product_id) {
    return res.status(400).json({ success: false, message: "review_id 또는 product_id 중 하나가 필요합니다." });
  }

  const sql = `
    INSERT INTO comment (review_id, product_id, user_id, content)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [review_id || null, product_id || null, user_id, content], (err, result) => {
    if (err) {
      console.error("댓글 등록 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 등록 실패" });
    }
    res.json({ success: true, message: "댓글 등록 완료", comment_id: result.insertId });
  });
});


// 📌 상품 댓글 조회
router.get("/list/product/:product_id", (req, res) => {
  const { product_id } = req.params;

  const sql = `
    SELECT c.comment_id, c.content, 
           DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at,
           u.username,
           c.user_id
    FROM comment c
    JOIN user u ON c.user_id = u.user_id
    WHERE c.product_id = ?
    ORDER BY c.created_at DESC
  `;

  db.query(sql, [product_id], (err, results) => {
    if (err) {
      console.error("댓글 조회 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 조회 실패" });
    }
    res.json({ success: true, comments: results });
  });
});


// 📌 리뷰 댓글 조회
router.get("/list/review/:review_id", (req, res) => {
  const { review_id } = req.params;

  const sql = `
    SELECT c.comment_id, c.content, 
           DATE_FORMAT(c.created_at, '%Y-%m-%d %H:%i') AS created_at,
           u.username,
           c.user_id
    FROM comment c
    JOIN user u ON c.user_id = u.user_id
    WHERE c.review_id = ?
    ORDER BY c.created_at DESC
  `;

  db.query(sql, [review_id], (err, results) => {
    if (err) {
      console.error("댓글 조회 오류:", err);
      return res.status(500).json({ success: false, message: "댓글 조회 실패" });
    }
    res.json({ success: true, comments: results });
  });
});


// 📌 댓글 수정 (작성자만 수정 가능)
router.put("/update", isLoggedIn, (req, res) => {
  const { comment_id, new_content } = req.body;
  const user_id = req.session.user.user_id; // 로그인한 사용자

  if (!comment_id || !new_content) {
    return res.status(400).json({ success: false, message: "comment_id와 new_content 필요" });
  }

  // 작성자 확인 쿼리
  const checkSql = `SELECT user_id FROM comment WHERE comment_id = ?`;

  db.query(checkSql, [comment_id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: "댓글을 찾을 수 없음" });
    }

    if (results[0].user_id !== user_id) {
      return res.status(403).json({ success: false, message: "수정 권한 없음" });
    }

    // 수정 실행
    const updateSql = `UPDATE comment SET content = ? WHERE comment_id = ?`;

    db.query(updateSql, [new_content, comment_id], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "댓글 수정 실패" });
      }
      res.json({ success: true, message: "댓글 수정 완료" });
    });
  });
});


// 📌 댓글 삭제 (작성자만 삭제 가능)
router.delete("/remove", isLoggedIn, (req, res) => {
  const { comment_id } = req.body;
  const user_id = req.session.user.user_id;

  if (!comment_id) {
    return res.status(400).json({ success: false, message: "comment_id 필요" });
  }

  const checkSql = `SELECT user_id FROM comment WHERE comment_id = ?`;

  db.query(checkSql, [comment_id], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ success: false, message: "댓글을 찾을 수 없음" });
    }

    if (results[0].user_id !== user_id) {
      return res.status(403).json({ success: false, message: "삭제 권한 없음" });
    }

    const deleteSql = `DELETE FROM comment WHERE comment_id = ?`;

    db.query(deleteSql, [comment_id], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "댓글 삭제 실패" });
      }
      res.json({ success: true, message: "댓글 삭제 완료" });
    });
  });
});

module.exports = router;



/*
원래코드에서 부족했던부분
1.댓글 수정기능 (update기능 관련 ) ==> 사용자가 작성한댓글 나중에 수정 불가 
2. 댓글작성자 확인/ 권한 검증 X ==> 현재 누구나 comment_id만 알면 그댓글 삭제가능 
   ==> 삭제, 수정시 작성자(user_id)확인하는 로직 필요 
3.댓글 작성시간(created_at)이 표시되지만 포맷 또는 정렬 옵션 부족 
   ==> 클라이언트에서 보기좋게 YYYY-MM-DD HH:MM형태로 보여주려면 수정필요 
4. 댓글이 review 인지 product인지 구분이 불명황 
   ==>지금은 WHERE (review_id = ? OR product_id = ?) 로 묶어버림 → 구조적으로 불명확
      review 댓글만 가져오거나, product 댓글만 가져오는 API를 분리하는 것이 더 명확
      함
5. 에러 응답 형식 불규칙 
   ==>어떤 곳은 send("삭제 실패"), 어떤 곳은 res.status(500).send(...)
      → JSON 통일 필요 ({success:false, message:"..."} 형식)
6. 비밀번호/ 본ㅇㄴ인증같은 보안요소 관련
    로그인 체크 안함 → 비회원도 댓글 작성 가능해버림.
    req.body.user_id만 넣으면 누구나 작성 가능 ❌
*/ 
