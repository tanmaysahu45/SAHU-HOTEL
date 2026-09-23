// ==========================================
// 1. GLOBAL CONFIGURATION & SESSION
// ==========================================
const DB_URL = "https://sahu-hotel-app-default-rtdb.firebaseio.com"; // ✅ Sahi Database

let currentCategory = 'All';
let DEFAULT_CATEGORIES = ['Hotel', 'Kirana', 'Dairy', 'Snacks']; 
let cloudCategoryMap = {}; 
const NO_IMAGE_URL = 'https://images.placeholders.dev/?width=150&height=150&text=No%20Image';
let selectedAddImageBase64 = null;
let selectedEditImageBase64 = null;

function checkPageSession() {
    const isLoggedIn = localStorage.getItem('currentUser');
    const email = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
    const path = window.location.pathname.toLowerCase();

    if (email.includes("tanmaysahu652") || email.includes("tanmay") || email.includes("sahu")) {
        localStorage.setItem('userRole', 'admin');
    }

    if (path.includes('calc.html')) return;

    if (path.includes('home.html') && !isLoggedIn) {
        window.location.replace("index.html");
    } 
    else if ((path.includes('index.html') || path.endsWith('/')) && isLoggedIn) {
        window.location.replace("home.html");
    }
}
checkPageSession();

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    window.location.replace("index.html");
}

// ==========================================
// 2. DASHBOARD INIT
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const currentUser = localStorage.getItem('currentUser') || 'Boss';
        const email = (localStorage.getItem('userEmail') || '').toLowerCase().trim();
        if (email.includes("tanmaysahu652") || email.includes("tanmay") || email.includes("sahu")) {
            localStorage.setItem('userRole', 'admin');
        }
        const userRole = localStorage.getItem('userRole') || 'customer';
        welcomeMessage.innerText = (userRole === 'admin' ? '👑 Boss: ' : 'Welcome, ') + currentUser;
        if (userRole === 'admin') {
            const adminSection = document.getElementById('adminSection');
            if (adminSection) adminSection.style.display = 'block';
            const posBillingDrawerBlock = document.getElementById('posBillingDrawerBlock');
            if (posBillingDrawerBlock) posBillingDrawerBlock.style.display = 'block';
            setupImageUploadListeners(); 
        }
        updateShopStatus(); 
        loadCategories(); 
    }
});

function loadCategories() {
    DEFAULT_CATEGORIES = ['Hotel', 'Kirana', 'Dairy', 'Snacks']; 
    cloudCategoryMap = {};
    renderCategoryElements(); 
    fetch(`${DB_URL}/categories.json`)
    .then(res => res.json())
    .then(data => {
        if(data) {
            Object.keys(data).forEach(key => {
                if (data[key] && data[key].name) {
                    cloudCategoryMap[key] = data[key].name;
                    if (!DEFAULT_CATEGORIES.includes(data[key].name)) {
                        DEFAULT_CATEGORIES.push(data[key].name);
                    }
                }
            });
        }
        renderCategoryElements(); 
        filterProducts();
    })
    .catch(() => { renderCategoryElements(); filterProducts(); });
}

function updateShopStatus() {
    const banner = document.getElementById('shopStatusBanner');
    if (!banner) return;
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 6 && currentHour < 22) {
        banner.innerHTML = '● Open Now'; banner.style.color = '#2E7D32';
    } else {
        banner.innerHTML = '● Closed'; banner.style.color = '#dc3545';
    }
}

function renderCategoryElements() {
    const dropdownMenu = document.getElementById('dropdownMenuOptions');
    const editProdCategoryDropdown = document.getElementById('editProdCategory'); 
    const tabsContainer = document.getElementById('categoryTabsContainer');

    if (dropdownMenu) {
        dropdownMenu.innerHTML = '';
        const createOpt = document.createElement('div');
        createOpt.className = 'custom-dropdown-option opt-create-trigger';
        createOpt.innerText = '[ ➕ Create New Category ]';
        createOpt.onclick = function() { triggerInlineCategoryCreation(); };
        dropdownMenu.appendChild(createOpt);
        DEFAULT_CATEGORIES.forEach(cat => {
            const opt = document.createElement('div');
            opt.className = 'custom-dropdown-option';
            opt.innerHTML = `<span>${cat}</span>`;
            let cloudKey = Object.keys(cloudCategoryMap).find(key => cloudCategoryMap[key] === cat);
            if (cloudKey && localStorage.getItem('userRole') === 'admin') {
                const cutBtn = document.createElement('span');
                cutBtn.className = 'opt-cut-btn';
                cutBtn.innerHTML = '×';
                cutBtn.onclick = function(e) { e.stopPropagation(); executeDirectDropdownDeletion(cloudKey, cat); };
                opt.appendChild(cutBtn);
            }
            opt.addEventListener('click', function(e) { if(e.target.className !== 'opt-cut-btn') selectCustomCategoryValue(cat); });
            dropdownMenu.appendChild(opt);
        });
    }

    if (editProdCategoryDropdown) {
        editProdCategoryDropdown.innerHTML = '';
        DEFAULT_CATEGORIES.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat; option.innerText = cat;
            editProdCategoryDropdown.appendChild(option);
        });
    }

    if (tabsContainer) {
        tabsContainer.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.innerText = 'All Items';
        allBtn.className = 'filter-tab' + (currentCategory === 'All' ? ' active-tab' : '');
        allBtn.onclick = function() { selectCategory('All'); };
        tabsContainer.appendChild(allBtn);
        DEFAULT_CATEGORIES.forEach(cat => {
            const btn = document.createElement('button');
            btn.innerText = cat;
            btn.className = 'filter-tab' + (currentCategory === cat ? ' active-tab' : '');
            btn.onclick = function() { selectCategory(cat); };
            tabsContainer.appendChild(btn);
        });
    }
}

function executeDirectDropdownDeletion(catId, catName) {
    if (confirm(`Delete category "${catName}"?`)) {
        fetch(`${DB_URL}/categories/${catId}.json`, { method: 'DELETE' })
        .then(() => { alert(`Category "${catName}" deleted!`); loadCategories(); })
        .catch(() => alert('Error deleting category!'));
    }
}

function createNewCategory() {
    const catInput = document.getElementById('newCategoryName');
    if (!catInput) return;
    const newCat = catInput.value.trim();
    if (newCat === '') { alert('Please enter a category name!'); return; }
    if (DEFAULT_CATEGORIES.map(c => c.toLowerCase()).includes(newCat.toLowerCase())) { alert('Category already exists!'); return; }
    fetch(`${DB_URL}/categories.json`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCat })
    }).then(() => { catInput.value = ''; loadCategories(); alert(`Category "${newCat}" added!`); });
}

function selectCategory(categoryName) { currentCategory = categoryName; renderCategoryElements(); filterProducts(); }

// ==========================================
// 3. IMAGE HANDLER
// ==========================================
function compressAndGetBase64(fileOrUrl, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image(); img.crossOrigin = "anonymous"; 
        if (fileOrUrl instanceof File) {
            const reader = new FileReader(); reader.readAsDataURL(fileOrUrl);
            reader.onload = (event) => { img.src = event.target.result; }; reader.onerror = (err) => reject(err);
        } else { img.src = fileOrUrl; }
        img.onload = () => {
            const canvas = document.createElement('canvas'); let width = img.width; let height = img.height;
            if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
            try { resolve(canvas.toDataURL('image/jpeg', quality)); } catch (e) { resolve(img.src); }
        };
        img.onerror = (err) => reject(err);
    });
}

function convertDriveLink(url) {
    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/(.+?)\//);
        if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
    return url;
}

function setupImageUploadListeners() {
    const addFileInput = document.getElementById('prodImageFile'); const addUrlInput = document.getElementById('prodImage'); const addPreviewImg = document.getElementById('imagePreview');
    const editFileInput = document.getElementById('editProdImageFile'); const editUrlInput = document.getElementById('editProdImage'); const editPreviewImg = document.getElementById('editImagePreview');

    if (addUrlInput) {
        addUrlInput.addEventListener('input', async function() {
            let val = addUrlInput.value.trim();
            if (val !== '') {
                val = convertDriveLink(val);
                try { selectedAddImageBase64 = await compressAndGetBase64(val, 800, 0.7); addPreviewImg.src = selectedAddImageBase64; addPreviewImg.style.display = 'block'; if(addFileInput) addFileInput.value = ''; } catch(e) { addPreviewImg.src = val; addPreviewImg.style.display = 'block'; selectedAddImageBase64 = val; }
            } else if (!selectedAddImageBase64) { addPreviewImg.style.display = 'none'; }
        });
    }
    if (addFileInput) {
        addFileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try { selectedAddImageBase64 = await compressAndGetBase64(file, 800, 0.7); addPreviewImg.src = selectedAddImageBase64; addPreviewImg.style.display = 'block'; if(addUrlInput) addUrlInput.value = ''; } catch (error) { selectedAddImageBase64 = null; }
            }
        });
    }
    if (editUrlInput) {
        editUrlInput.addEventListener('input', async function() {
            let val = editUrlInput.value.trim();
            if (val !== '') {
                val = convertDriveLink(val);
                try { selectedEditImageBase64 = await compressAndGetBase64(val, 800, 0.7); editPreviewImg.src = selectedEditImageBase64; if(editFileInput) editFileInput.value = ''; } catch(e) { editPreviewImg.src = val; selectedEditImageBase64 = val; }
            }
        });
    }
    if (editFileInput) {
        editFileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                try { selectedEditImageBase64 = await compressAndGetBase64(file, 800, 0.7); editPreviewImg.src = selectedEditImageBase64; if(editUrlInput) editUrlInput.value = ''; } catch (error) { selectedEditImageBase64 = null; }
            }
        });
    }
}

// ==========================================
// 4. ADD PRODUCT SYSTEM
// ==========================================
const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
    addProductForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const name = document.getElementById('prodName').value.trim();
        const category = document.getElementById('prodCategory').value; 
        let urlImage = document.getElementById('prodImage').value.trim();
        const barcode = document.getElementById('prodBarcode').value.trim();

        if(!category) { alert('Please select a Category Group first!'); return; }

        let priceArray = [];
        document.querySelectorAll('#priceContainer .price-row').forEach(row => {
            let val = row.querySelector('.price-val').value;
            let label = row.querySelector('.price-label').value;
            if(val && label) priceArray.push({ rate: val, qty: label });
        });
        if (priceArray.length === 0) { alert('Please add at least one Price and Quantity!'); return; }

        const wholesalePriceInput = document.getElementById('prodWholesalePrice').value;
        const finalWholesaleString = wholesalePriceInput ? `₹${wholesalePriceInput}` : '';

        urlImage = convertDriveLink(urlImage);
        let finalImage = NO_IMAGE_URL;
        if (selectedAddImageBase64) finalImage = selectedAddImageBase64;
        else if (urlImage !== '') finalImage = urlImage;

        const productObject = { name, prices: priceArray, wholesalePrice: finalWholesaleString, image: finalImage, category, barcode };

        const submitBtn = addProductForm.querySelector('button[type="submit"]');
        submitBtn.innerText = 'Publishing...'; submitBtn.disabled = true;

        fetch(`${DB_URL}/products.json`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productObject)
        }).then(res => {
            if (!res.ok) throw new Error("Network Response was not OK");
            return res.json();
        }).then(() => {
            addProductForm.reset();
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('dropdownSelectedValue').innerText = '-- Choose --';
            document.getElementById('prodCategory').value = '';
            document.getElementById('priceContainer').innerHTML = `<label style="font-size: 12px; color: #2E7D32; font-weight: bold; display: block; margin-bottom: 8px;">4. Prices (Add Multiple Rates):</label><div class="price-row"><input type="number" class="price-val" placeholder="Price (₹ e.g. 50)" style="flex: 1;" required><input type="text" class="price-label" placeholder="Weight/Qty (e.g. 1 Kg)" style="flex: 1;" required></div>`;
            selectedAddImageBase64 = null; filterProducts(); alert('✅ Product Published Successfully!');
        }).catch((err) => { alert('❌ Error: ' + err.message + '\nCheck Firebase Rules (.read/.write = true)'); })
        .finally(() => { submitBtn.innerText = 'Publish Product Globally'; submitBtn.disabled = false; });
    });
}

// ==========================================
// 5. RENDER PRODUCTS
// ==========================================
function filterProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;
    const searchBar = document.getElementById('searchBar');
    const searchText = searchBar ? searchBar.value.toLowerCase().trim() : '';

    fetch(`${DB_URL}/products.json`)
    .then(res => res.json())
    .then(data => {
        productsGrid.innerHTML = ''; 
        if (!data) { productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#999; padding: 20px;">No products found. Add products above!</p>'; return; }

        let productsList = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
        const filteredList = productsList.filter(product => {
            const matchesCategory = (currentCategory === 'All' || product.category === currentCategory);
            const productBarcode = product.barcode ? product.barcode.toLowerCase() : '';
            const matchesSearch = (product.name || '').toLowerCase().includes(searchText) || (product.category || '').toLowerCase().includes(searchText) || productBarcode.includes(searchText);
            return matchesCategory && matchesSearch;
        });

        if (filteredList.length === 0) { productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#999; padding: 20px;">No matching items found.</p>'; return; }

        filteredList.forEach((product) => {
            const card = document.createElement('div'); card.className = 'product-card';
            const safeName = (product.name || '').replace(/'/g, "\\'").replace(/"/g, '"');
            const safeWholesale = product.wholesalePrice ? product.wholesalePrice.replace(/'/g, "\\'") : '';
            const safeBarcode = product.barcode ? product.barcode.replace(/'/g, "\\'") : '';
            const pricesJson = encodeURIComponent(JSON.stringify(product.prices || []));

            let actionHtml = ''; let wholesaleHtml = ''; let barcodeTagHtml = '';
            const userRole = localStorage.getItem('userRole') || 'customer';
            
            if (userRole === 'admin') {
                if (product.barcode) barcodeTagHtml = `<div style="font-size:10px; color:#aaa; margin-top:4px;">🏷️ Code: ${product.barcode}</div>`;
                if (product.wholesalePrice) wholesaleHtml = `<div style="font-size: 11px; color: #E65100; font-weight: bold; margin-bottom: 5px; background: rgba(230,81,0,0.1); padding: 4px 6px; border-radius: 4px;">📦 Wholesale: ${product.wholesalePrice}</div>`;
                actionHtml = `<div class="admin-action-btns"><button class="edit-btn" onclick="openEditModal('${product.id}', '${safeName}', '${safeWholesale}', '${product.category}', '${product.image}', '${safeBarcode}', '${pricesJson}')">Edit</button><button class="delete-btn" onclick="deleteProduct('${product.id}')">Delete</button></div>`;
            }

            let displayPrice = "Price On Call";
            if (product.prices && product.prices.length > 0) {
                displayPrice = `₹${product.prices[0].rate} / ${product.prices[0].qty}`;
                if (product.prices.length > 1) displayPrice += ` <span style="font-size:10px; color:#aaa;">(+${product.prices.length - 1} options)</span>`;
            } else if (product.price) displayPrice = product.price;

            card.innerHTML = `
                <div onclick="openProductModal('${safeName}', '${pricesJson}')" style="width:100%; cursor:pointer;">
                    <img src="${product.image || NO_IMAGE_URL}" alt="${product.name}" onerror="this.onerror=null; this.src='${NO_IMAGE_URL}';">
                    <h4>${product.name}</h4>
                    <div class="price">${displayPrice}</div>
                    ${barcodeTagHtml}
                    ${wholesaleHtml}
                </div>
                ${actionHtml}
            `;
            productsGrid.appendChild(card);
        });
    })
    .catch(() => { productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#999; padding: 20px;">Failed to load live items.</p>'; });
}

function openProductModal(name, pricesJson) {
    document.getElementById('modalProdName').innerText = name;
    let prices = []; try { prices = JSON.parse(decodeURIComponent(pricesJson)); } catch(e){}
    let priceHtml = '';
    if (prices && prices.length > 0) {
        prices.forEach(p => { priceHtml += `<div style="background: rgba(46,125,50,0.1); padding: 6px; margin-bottom: 4px; border-radius: 4px; border: 1px solid rgba(46,125,50,0.3);">₹${p.rate} / ${p.qty}</div>`; });
    } else { priceHtml = `<div>Price On Call</div>`; }
    document.getElementById('modalPrices').innerHTML = priceHtml;
    document.getElementById('productModal').style.display = 'flex';
}

function closeModal() { document.getElementById('productModal').style.display = 'none'; }

function openEditModal(id, name, wholesaleWithSymbol, category, image, barcode, pricesJson) {
    document.getElementById('editProdId').value = id;
    document.getElementById('editProdName').value = name;
    document.getElementById('editProdBarcode').value = (barcode && barcode !== 'undefined') ? barcode : '';
    if (wholesaleWithSymbol && wholesaleWithSymbol !== 'undefined') document.getElementById('editProdWholesalePrice').value = wholesaleWithSymbol.replace('₹', '').trim();
    else document.getElementById('editProdWholesalePrice').value = '';
    document.getElementById('editPriceContainer').innerHTML = '';
    let prices = []; try { prices = JSON.parse(decodeURIComponent(pricesJson)); } catch(e){}
    if(prices && prices.length > 0) prices.forEach(p => addEditPriceField(p.rate, p.qty));
    else addEditPriceField('', '');
    document.getElementById('editProdCategory').value = category;
    document.getElementById('editImagePreview').src = image;
    document.getElementById('editProdImage').value = '';
    selectedEditImageBase64 = null;
    document.getElementById('editProductModal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('editProductModal').style.display = 'none'; }

function submitProductEdit() {
    const id = document.getElementById('editProdId').value;
    const name = document.getElementById('editProdName').value.trim();
    const category = document.getElementById('editProdCategory').value;
    let editUrlImage = document.getElementById('editProdImage').value.trim();
    const currentImageUrl = document.getElementById('editImagePreview').src; 
    const barcode = document.getElementById('editProdBarcode').value.trim();

    if (!name) { alert("Please fill the product name."); return; }

    let priceArray = [];
    document.querySelectorAll('#editPriceContainer .edit-price-row').forEach(row => {
        let val = row.querySelector('.edit-price-val').value;
        let label = row.querySelector('.edit-price-label').value;
        if(val && label) priceArray.push({ rate: val, qty: label });
    });

    const wholesaleInput = document.getElementById('editProdWholesalePrice').value;
    const finalWholesaleString = wholesaleInput ? `₹${wholesaleInput}` : '';

    editUrlImage = convertDriveLink(editUrlImage);
    let finalImage = currentImageUrl;
    if (selectedEditImageBase64) finalImage = selectedEditImageBase64;
    else if (editUrlImage !== '') finalImage = editUrlImage;

    const updatedProduct = { name, prices: priceArray, wholesalePrice: finalWholesaleString, image: finalImage, category, barcode };

    const editBtn = document.querySelector('#editProductModal .publish-submit-btn');
    editBtn.innerText = 'Saving...'; editBtn.disabled = true;

    fetch(`${DB_URL}/products/${id}.json`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProduct)
    }).then(() => { closeEditModal(); filterProducts(); alert('Product Record Saved!'); })
    .catch(() => { alert('Error updating database!'); })
    .finally(() => { editBtn.innerText = 'Save Changes'; editBtn.disabled = false; });
}

function deleteProduct(id) {
    if (confirm('Delete this item from global cloud?')) {
        fetch(`${DB_URL}/products/${id}.json`, { method: 'DELETE' }).then(() => { filterProducts(); });
    }
}

window.logout = logout; window.createNewCategory = createNewCategory; window.selectCategory = selectCategory; window.filterProducts = filterProducts; window.openProductModal = openProductModal; window.closeModal = closeModal; window.deleteProduct = deleteProduct; window.openEditModal = openEditModal; window.closeEditModal = closeEditModal; window.submitProductEdit = submitProductEdit;