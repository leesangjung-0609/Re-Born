// seller.js (판매자 정보 페이지 전용)

// URL에서 seller_id(또는 id) 파라미터 추출
const urlParams = new URLSearchParams(window.location.search);
const sellerId = urlParams.get('id') || urlParams.get('sellerId');

// =========================================
// 1. HTML 템플릿 생성 함수 (재사용)
// =========================================
function createCardHTML(item, type) {
    let dateLabel = "등록일";
    let linkId = item.product_id || item.id;
    let imgUrl = item.image_url || item.img || 'https://via.placeholder.com/220x180?text=No+Image';
    let title = item.title;
    let price = item.price ? item.price.toLocaleString() : '0';
    let displayDate = item.created_at || item.date;

    if (type === 'sold') dateLabel = "판매일";
    if (type === 'bought') dateLabel = "구매일";

    // 찜 목록(wishlist) 관련 로직은 모두 제거됨

    return `
        <div class="product-card">
          <a href="product_detail.html?id=${linkId}">
            <img src="${imgUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/220x180?text=No+Image'">
            <div class="card-content">
              <h4>${title}</h4>
              <p class="price">${price}원</p>
              <p class="date">${dateLabel}: ${displayDate}</p>
            </div>
          </a>
        </div>
    `;
}

// =========================================
// 2. 화면 렌더링 함수
// =========================================
function renderList(containerId, dataList, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';


    if (!dataList || dataList.length === 0) {
        container.innerHTML = '<p style="padding: 20px; color: #888;">내역이 없습니다.</p>';
        return;
    }

    let htmlString = '';
    dataList.forEach(item => {
        htmlString += createCardHTML(item, type);
    });

    container.innerHTML = htmlString;
}

// =========================================
// 3. 서버 데이터 로드 함수 (판매자 ID 포함)
// =========================================
async function loadDataAndRender(endpoint, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // sellerId가 없으면 로드하지 않음
    if (!sellerId) {
        container.innerHTML = '<p style="padding:20px;color:red;">판매자 정보를 찾을 수 없습니다. (ID 누락)</p>';
        return;
    }

    container.innerHTML = '<p style="padding: 20px; color: #888;">데이터를 불러오는 중...</p>';

    try {
        // 엔드포인트에 쿼리 파라미터로 판매자 ID 추가 (예: /product/selling?userId=5)
        // 백엔드 라우터 구조에 따라 URL 형식은 수정이 필요할 수 있습니다.
        const separator = endpoint.includes('?') ? '&' : '?';
        let finalUrl = endpoint;
        finalUrl = `${endpoint}${separator}userId=${sellerId}`;
        const res = await fetch(finalUrl);

        if (!res.ok) throw new Error(`데이터 로드 실패: ${finalUrl}`);

        const data = await res.json();
        renderList(containerId, data, type);

    } catch (error) {
        console.error(`[${containerId}] 데이터 로드 오류:`, error);
        container.innerHTML = `<p style="padding: 20px; color: #888;">비공개 정보이거나 데이터를 불러올 수 없습니다.</p>`;
    }
}

// =========================================
// 4. 판매자 프로필 정보 로드
// =========================================
async function loadSellerInfo() {
    if (!sellerId) {
        alert("잘못된 접근입니다. 판매자 ID가 없습니다.");
        window.history.back();
        return;
    }

    try {
        // 판매자 기본 정보 가져오기 (예: /user/seller/5 또는 /user/info?id=5)
        // 이 부분은 백엔드 구현에 맞춰 경로를 수정하세요.
        const res = await fetch(`/user/seller/${sellerId}`);

        if (!res.ok) throw new Error("판매자 정보를 불러오는 데 실패했습니다.");

        const data = await res.json();

        // 닉네임, 전화번호, 생일 표시
        document.querySelector(".info-value.nickname").textContent = data.nickname || data.name || "정보 없음";
        document.querySelector(".info-value.phone").textContent = data.phone || data.phone_number || "비공개";
        document.querySelector(".info-value.birth").textContent = data.birth || data.birthday || "비공개";

    } catch (err) {
        console.error("판매자 정보 로드 실패:", err);
        document.querySelector(".info-value.nickname").textContent = "알 수 없음";
    }
}

// =========================================
// 5. 초기화 및 실행
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. 판매자 정보 로드
    loadSellerInfo();

    // 2. 판매중 목록 가져오기 (찜 목록은 제외됨)
    loadDataAndRender('/product/selling', 'selling-list', 'selling');

    // 3. 판매 완료 목록 가져오기
    loadDataAndRender('/product/sold', 'sales-list', 'sold');

    // 4. 구매 목록 가져오기
    loadDataAndRender('/product/bought', 'purchase-list', 'bought');
});