const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("../db/db");

// 회원가입
router.post("/signup", async (req, res) => {
  const { username, password, name, email, phone } = req.body;

  if (!username || !password || !name || !email) {
    return res.status(400).send("모든 필드를 입력해주세요.");
  }

  try {
    const hashedPw = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO user (username, password, name, email, phone, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `;

    db.query(sql, [username, hashedPw, name, email, phone || null], (err) => {
      if (err) {
        console.error("회원가입 실패:", err);
        // 이메일 또는 사용자 이름 중복 등의 오류 처리 로직 추가 가능
        return res.status(500).send("회원가입 실패");
      }
      res.send("회원가입 완료!");
    });

  } catch (error) {
    console.error("회원가입 오류:", error);
    res.status(500).send("서버 오류");
  }
});

// 📌 로그인 (세션에 `user` 객체 형태로 저장)
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // DB에서 사용자 정보 조회 (user_id, username, name, email 필드를 포함하여 조회)
  const sql = `SELECT user_id, username, password, name, email FROM user WHERE username = ? AND status = 'active'`;

  db.query(sql, [username], async (err, results) => {
    if (err) {
      console.error("로그인 쿼리 오류:", err);
      return res.status(500).send("로그인 실패");
    }

    if (results.length === 0) {
      return res.status(400).send("아이디가 존재하지 않습니다.");
    }

    const user = results[0];
    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(400).send("비밀번호가 일치하지 않습니다.");
    }

    // ✅ 세션에 저장할 정보: user_id와 사용자 식별에 필요한 정보
    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      name: user.name,
      email: user.email
    };

    // 변경 사항 저장을 확실히 하기 위해 save 호출
    req.session.save(err => {
      if (err) {
        console.error("세션 저장 오류:", err);
        return res.status(500).send("로그인 성공, 세션 저장 실패");
      }

      res.send({
        message: "로그인 성공",
        username: user.username
      });
    });
  });
});

// 로그아웃
router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("로그아웃 실패");
    res.send({ message: "로그아웃 완료" });
  });
});

// 📌 내 정보 조회
router.get("/info", (req, res) => {
    // 로그인 안되어 있으면 바로 리턴
    if (!req.session.user) {
        return res.status(401).send("로그인 필요");
    }

    const userId = req.session.user.user_id;

    const sql = `
        SELECT user_id, username, name, email, phone, status, age, birth, gender, created_at 
        FROM user 
        WHERE user_id = ?
    `;

    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("내 정보 조회 오류:", err);
            return res.status(500).send("서버 오류");
        }
        if (results.length === 0) return res.status(404).send("회원 정보를 찾을 수 없습니다.");

        res.send(results[0]);
    });
});

// 아이디 중복 확인
router.post("/check-username", (req, res) => {
  const { username } = req.body;
  const sql = `SELECT * FROM user WHERE username = ?`;

  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error("중복 확인 오류:", err);
      return res.status(500).send("서버 오류");
    }

    res.send({ exists: results.length > 0 });
  });
});

// 📌 현재 로그인 상태 확인 (프론트엔드에서 사용)
router.get("/current", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ loggedIn: false });
  }

  const userId = req.session.user.user_id;

  const sql = `
    SELECT username, status 
    FROM user 
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error("현재 로그인 사용자 조회 오류:", err);
      return res.status(500).send("서버 오류");
    }

    if (results.length === 0) {
      return res.status(404).json({ loggedIn: false });
    }

    const user = results[0];

    res.json({
      loggedIn: true,
      username: user.username,
      user_id: userId,
      status: user.status
    });
  });
});

router.get("/seller/:sellerId", (req, res) => {
  const sellerId = req.params.sellerId;

  const sql = `
    SELECT user_id, username, name, email
    FROM user
    WHERE user_id = ?
  `;

  db.query(sql, [sellerId], (err, results) => {
    if (err) return res.status(500).send("판매자 조회 실패");
    if (results.length === 0) return res.status(404).send("판매자를 찾을 수 없습니다.");

    res.json(results[0]);
  });
});
module.exports = router;