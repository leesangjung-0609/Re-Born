const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db/db");

// ... (회원가입, 로그인, 로그아웃 코드는 기존 그대로 유지하세요) ...

router.post("/signup", async (req, res) => { /* 기존 코드 유지 */ });
router.post("/login", (req, res) => { /* 기존 코드 유지 */ });
router.post("/logout", (req, res) => { /* 기존 코드 유지 */ });

// 내 정보 조회
router.get("/info", (req, res) => {
    if (!req.session.user) return res.status(401).send("로그인 필요");
    const userId = req.session.user.user_id;
    const sql = `SELECT user_id, username, name, email, phone, status, age, birth, gender, created_at FROM user WHERE user_id = ?`;
    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).send("오류");
        if (results.length === 0) return res.status(404).send("정보 없음");
        res.send(results[0]);
    });
});

// ... (중복확인, 현재상태확인 코드 기존 그대로 유지) ...
router.post("/check-username", (req, res) => { /* 기존 코드 유지 */ });
router.get("/current", (req, res) => { /* 기존 코드 유지 */ });

// ==========================================
// [수정됨] 타인(판매자) 정보 조회
// ==========================================
router.get("/seller/:sellerId", (req, res) => {
  const sellerId = req.params.sellerId;

  // 닉네임(name), 전화번호(phone), 생일(birth) 추가 조회
  const sql = `
    SELECT user_id, username, name, phone, birth
    FROM user
    WHERE user_id = ?
  `;

  db.query(sql, [sellerId], (err, results) => {
    if (err) {
        console.error("판매자 조회 DB 오류:", err);
        return res.status(500).send("판매자 조회 실패");
    }
    if (results.length === 0) {
        return res.status(404).send("판매자를 찾을 수 없습니다.");
    }
    
    // 조회된 정보 반환
    res.json(results[0]);
  });
});

module.exports = router;
