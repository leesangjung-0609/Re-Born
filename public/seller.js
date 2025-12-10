// seller_info.js — 판매자 정보 페이지 전용 스크립트
// my_info.js를 기반으로 하되 "로그인 사용자"가 아닌
// "조회 중인 판매자 ID" 기준으로 정보와 내역을 불러오는 버전

// =========================================
// 1. 카드 HTML 생성 (my_info.js 그대로 사용 가능)
// =========================================
function createCardHTML(item, type) {
    let dateLabel = "등록일";
    let linkId = item.product_id || item.id;
    let imgUrl = item.image_url || item.img || 'https://via.placeholder.com/220x180?text=No+Image';
    let title = item.title;
    let price = item.price;
    let displayDate = item.created_at || item.date;

    if (type === 'sold') dateLabel = "판매일";
    if (type === 'bought') dateLabel = "구매일";

    const formattedPrice = price.toLocaleString();

    return `
        <div class="product-card">
          <a href="product_detail.html?id=${linkId}">
            <img src="${imgUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/220x180?text=No+Image'">
            <div class="card-content">
              <h4>${title}</h4>
              <p class="price">${formattedPrice}원</p>
              <p class="date">${dateLabel}: ${displayDate}</p>
            </div>
          </a>
        </div>
    `;
}

// =========================================
// 2. 렌더링 실행 함수 — 찜 목록은 제거
// =========================================
function renderList(containerId, dataList, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (dataList.length === 0) {
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
// 3. 서버에서 판매자의 정보를 가져오기
// =========================================
async function loadSellerInfo(sellerId) {
    try {
        const res = await fetch(`/user/info/${sellerId}`);
        if (!res.ok) throw new Error('판매자 정보를 불러오지 못했습니다.');

        const data = await res.json();

        document.querySelector('.info-value.nickname').textContent = data.nickname || '정보 없음';
        document.querySelector('.info-value.phone').textContent = data.phone || '정보 없음';
        document.querySelector('.info-value.gender').textContent = data.gender || '정보 없음';

    } catch (error) {
        console.error('판매자 정보 조회 오류:', error);
    }
}

// =========================================
// 4. 판매자 기준으로 상품/내역 로드
// =========================================
async function loadDataForSeller(endpoint, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p style="padding: 20px; color: #888;">데이터를 불러오는 중...</p>';

    try {
        const res = await fetch(endpoint);
        if (!res.ok) throw new Error(`로드 실패: ${endpoint}`);

        const data = await res.json();
        renderList(containerId, data, type);

    } catch (error) {
        console.error(`[${type}] 로드 오류`, error);
        container.innerHTML = `<p style="padding: 20px; color: red;">데이터를 불러오지 못했습니다.</p>`;
    }
}

// =========================================
// 5. 초기 실행 — URL에서 sellerId 가져오기
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('id');

    if (!sellerId) {
        alert('⚠ 판매자 ID가 제공되지 않았습니다.');
        return;
    }

    // 1) 판매자 정보 로드
    loadSellerInfo(sellerId);

    // 2) 판매중인 상품
    loadDataForSeller(`/product/selling/${sellerId}`, 'selling-list', 'selling');

    // 3) 판매 내역
    loadDataForSeller(`/product/sold/${sellerId}`, 'sales-list', 'sold');

    // 4) 구매 내역
    loadDataForSeller(`/product/bought/${sellerId}`, 'purchase-list', 'bought');
});
