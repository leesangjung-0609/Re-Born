const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const db = require("../db/db");
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, UPLOAD_DIR); }, 
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 1. 상품 등록
router.post("/add", (req, res) => {
    upload.single("productImage")(req, res, (err) => {
        if (err) return res.status(500).json({ message: "파일 업로드 오류" });
        
        const userId = req.session.user ? req.session.user.user_id : null;
        if (!userId) return res.status(401).send("로그인 필요");

        const { title, description, price, category } = req.body;
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        
        if (!title || !price) return res.status(400).send("필수 값 누락");

        const sql = `INSERT INTO product (title, price, description, image_url, category, seller_id, status) VALUES (?, ?, ?, ?, ?, ?, '판매중')`;
        db.query(sql, [title, price, description || null, image_url, category || null, userId], (err, result) => {
            if (err) return res.status(500).send("상품 등록 실패");
            res.json({ message: "상품 등록 성공", productId: result.insertId });
        });
    });
});

// ==========================================
// 2. 판매중인 상품 목록 (충돌 해결 핵심 로직)
// ==========================================
router.get("/selling", (req, res) => {
  // [1] 프론트엔드에서 ?userId=5 라고 보냈으면 5번 유저 (판매자 페이지)
  // [2] 안 보냈으면 세션에 저장된 내 아이디 (마이 페이지)
  const targetId = req.query.userId || (req.session.user ? req.session.user.user_id : null);

  if (!targetId) {
      return res.status(401).send("로그인이 필요하거나 조회할 사용자 ID가 없습니다.");
  }

  const sql = `
    SELECT * FROM product
    WHERE seller_id = ? AND status = '판매중'
    ORDER BY created_at DESC
  `;

  db.query(sql, [targetId], (err, results) => {
    if (err) {
        console.error("판매중 상품 조회 오류:", err);
        return res.status(500).send("조회 실패");
    }
    res.json(results);
  });
});

// ==========================================
// 3. 상품 상세 조회 (UI 깨짐 방지: status, seller_id 포함)
// ==========================================
router.get("/:id", (req, res) => {
  const productId = req.params.id;
  
  // productId가 숫자가 아닌 경우 (예: 'list', 'category' 등이 id로 들어오는 것 방지)
  if (isNaN(productId)) {
      return res.status(400).send("잘못된 요청입니다.");
  }

  const sql = `
    SELECT 
      p.product_id,
      p.title,
      p.price,
      p.description,
      p.image_url,
      p.category,
      p.status,      /* ✅ 중요: 초록색 판매 상태 박스 표시용 */
      p.seller_id,   /* ✅ 중요: 판매자 ID 확인용 */
      u.username
    FROM product p
    JOIN user u ON p.seller_id = u.user_id
    WHERE p.product_id = ?
  `;
  db.query(sql, [productId], (err, results) => {
    if (err) return res.status(500).send("상세 조회 실패");
    if (results.length === 0) return res.status(404).send("상품 없음");
    res.json(results[0]);
  });
});

// 4. 전체 리스트 (메인화면용)
router.get("/list", (req, res) => {
  const sql = `
    SELECT p.*, u.username AS seller
    FROM product p
    JOIN user u ON p.seller_id = u.user_id
    WHERE p.status = '판매중'
    ORDER BY p.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send("오류");
    res.json(results);
  });
});

module.exports = router;
