// ==========================================
// 1. GLOBAL CONFIGURATION & INSTANT SESSION CONTROL
// ==========================================
const DB_URL = "https://sahu-hotel-app-default-rtdb.firebaseio.com";

let currentCategory = 'All';
let DEFAULT_CATEGORIES = ['Hotel', 'Kirana', 'Dairy', 'Snacks']; 
let cloudCategoryMap = {}; 

const NO_IMAGE_URL = 'https://images.placeholders.dev/?width=150&height=150&text=No%20Image';

let selectedAddImageBase64 = null;
let selectedEditImageBase64 = null;

function checkPageSession() {
    const isLoggedIn = localStorage.getItem('currentUser');
    const path = window.location.pathname;

    if (path.includes('home.html') && !isLoggedIn) {
        window.location.replace("index.html");
    } 
    else if ((path.includes('index.html') || path.endsWith('/')) && isLoggedIn) {
        window.location.replace("home.html");
    }
}
checkPageSession(); // Instant run

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    window.location.replace("index.html");
}

// ==========================================
// 2. LIVE LOGIN & REGISTER SYSTEM (GLOBAL)
// ==========================================
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMsg = document.getElementById('errorMessage');

    usernameInput.addEventListener('input', clearErrors);
    passwordInput.addEventListener('input', clearErrors);

    function clearErrors() {
        usernameInput.classList.remove('error-border');
        passwordInput.classList.remove('error-border');
        if (errorMsg) errorMsg.style.display = 'none';
    }

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); 
        clearErrors();

        const originalUsername = usernameInput.value.trim();
        const uValue = originalUsername.toLowerCase(); 
        const pValue = passwordInput.value;

        if (uValue.includes(" ")) {
            showRedError("⚠️ Spaces are not allowed in username!");
            usernameInput.classList.add('error-border');
            return;
        }

        if (pValue.length < 4) {
            showRedError("⚠️ Password must be at least 4 characters long!");
            passwordInput.classList.add('error-border');
            return;
        }

        if (uValue === "tanmaysahu" && pValue === "boss") {
            localStorage.setItem('currentUser', 'tanmaysahu');
            localStorage.setItem('userRole', 'admin');
            alert('Welcome Back, Boss!');
            window.location.replace("home.html");
            return;
        }

        fetch(`${DB_URL}/users/${uValue}.json`)
        .then(res => res.json())
        .then(registeredUser => {
            if (!registeredUser) {
                const newUserData = { username: originalUsername, password: pValue, role: 'customer' };
                
                fetch(`${DB_URL}/users/${uValue}.json`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newUserData)
                })
                .then(() => {
                    localStorage.setItem('currentUser', originalUsername);
                    localStorage.setItem('userRole', 'customer');
                    alert('New Account Created & Saved on Cloud Network!');
                    window.location.replace("home.html");
                });
            } 
            else {
                if (registeredUser.password === pValue) {
                    localStorage.setItem('currentUser', registeredUser.username);
                    localStorage.setItem('userRole', registeredUser.role);
                    alert('Login Successful!');
                    window.location.replace("home.html");
                } else {
                    showRedError("⚠️ Incorrect Password! Access Denied.");
                    passwordInput.classList.add('error-border');
                }
            }
        })
        .catch(() => {
            showRedError("⚠️ Cloud Connection Error!");
        });
    });

    function showRedError(message) {
        if (errorMsg) {
            errorMsg.style.display = 'block';
            errorMsg.innerText = message;
        }
    }
}

// ==========================================
// 3. HOME DASHBOARD INITIAL LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const welcomeMessage = document.getElementById('welcomeMessage');

    if (welcomeMessage) {
        const currentUser = localStorage.getItem('currentUser') || 'Guest';
        const userRole = localStorage.getItem('userRole') || 'customer';
        
        welcomeMessage.innerText = 'Welcome, ' + currentUser;
        
        if (userRole === 'admin') {
            const adminSection = document.getElementById('adminSection');
            if (adminSection) adminSection.style.display = 'block';
            setupImageUploadListeners(); 
        }
        
        updateShopStatus(); 
        loadCategories(); 
    }
});

function loadCategories() {
    fetch(`${DB_URL}/categories.json`)
    .then(res => res.json())
    .then(data => {
        DEFAULT_CATEGORIES = ['Hotel', 'Kirana', 'Dairy', 'Snacks']; 
        cloudCategoryMap = {};
        if(data) {
            Object.keys(data).forEach(key => {
                cloudCategoryMap[key] = data[key].name;
                if (!DEFAULT_CATEGORIES.includes(data[key].name)) {
                    DEFAULT_CATEGORIES.push(data[key].name);
                }
            });
        }
        renderCategoryElements(); 
        filterProducts();
    })
    .catch(() => {
        renderCategoryElements(); 
        filterProducts();
    });
}

// ==========================================
// 4. MANAGEMENT STATIONS, TABS & SHOP STATUS
// ==========================================
function updateShopStatus() {
    const banner = document.getElementById('shopStatusBanner');
    if (!banner) return;
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 6 && currentHour < 22) {
        banner.innerHTML = '● Open Now (Store is Open)';
        banner.style.color = '#28a745';
    } else {
        banner.innerHTML = '● Closed (Store is Closed)';
        banner.style.color = '#dc3545';
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
                cutBtn.onclick = function(e) {
                    e.stopPropagation(); 
                    executeDirectDropdownDeletion(cloudKey, cat);
                };
                opt.appendChild(cutBtn);
            }
            
            opt.addEventListener('click', function(e) {
                if(e.target.className !== 'opt-cut-btn') {
                    selectCustomCategoryValue(cat);
                }
            });
            dropdownMenu.appendChild(opt);
        });
    }

    if (editProdCategoryDropdown) {
        editProdCategoryDropdown.innerHTML = '';
        DEFAULT_CATEGORIES.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.innerText = cat;
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
    if (confirm(`Are you sure you want to permanently delete the category "${catName}"?`)) {
        fetch(`${DB_URL}/categories/${catId}.json`, { method: 'DELETE' })
        .then(() => {
            alert(`Category "${catName}" deleted!`);
            loadCategories(); 
        })
        .catch(() => alert('Error deleting category!'));
    }
}

function createNewCategory() {
    const catInput = document.getElementById('newCategoryName');
    if (!catInput) return;
    const newCat = catInput.value.trim();

    if (newCat === '') {
        alert('Please enter a valid category name!');
        return;
    }

    if (DEFAULT_CATEGORIES.map(c => c.toLowerCase()).includes(newCat.toLowerCase())) {
        alert('Category already exists!');
        return;
    }

    fetch(`${DB_URL}/categories.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCat })
    })
    .then(() => {
        catInput.value = '';
        loadCategories(); 
        alert(`Category "${newCat}" added successfully!`);
    });
}

function selectCategory(categoryName) {
    currentCategory = categoryName;
    renderCategoryElements(); 
    filterProducts(); 
}

// ==========================================
// 5. IMAGE COMPRESSION ENGINE
// ==========================================
function compressAndGetBase64(fileOrUrl, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; 

        if (fileOrUrl instanceof File) {
            const reader = new FileReader();
            reader.readAsDataURL(fileOrUrl);
            reader.onload = (event) => { img.src = event.target.result; };
            reader.onerror = (err) => reject(err);
        } else {
            img.src = fileOrUrl;
        }

        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            try {
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            } catch (e) {
                resolve(img.src);
            }
        };
        img.onerror = (err) => reject(err);
    });
}

function convertDriveLink(url) {
    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/(.+?)\//);
        if (match && match[1]) {
            return `https://drive.google.com/uc?export=view&id=${match[1]}`;
        }
    }
    return url;
}

function setupImageUploadListeners() {
    const addFileInput = document.getElementById('prodImageFile');
    const addUrlInput = document.getElementById('prodImage');
    const addPreviewImg = document.getElementById('imagePreview');
    const addFileText = document.getElementById('fileChosenText');
    
    const editFileInput = document.getElementById('editProdImageFile');
    const editUrlInput = document.getElementById('editProdImage');
    const editPreviewImg = document.getElementById('editImagePreview');
    const editFileText = document.getElementById('editFileChosenText');

    if (addUrlInput) {
        addUrlInput.addEventListener('input', async function() {
            let val = addUrlInput.value.trim();
            if (val !== '') {
                val = convertDriveLink(val);
                if (addFileText) addFileText.innerText = "Processing URL Image...";
                try {
                    selectedAddImageBase64 = await compressAndGetBase64(val, 800, 0.7);
                    addPreviewImg.src = selectedAddImageBase64;
                    addPreviewImg.style.display = 'block';
                    if(addFileInput) addFileInput.value = ''; 
                    if(addFileText) addFileText.innerText = "URL Loaded & Optimized!";
                } catch(e) {
                    addPreviewImg.src = val;
                    addPreviewImg.style.display = 'block';
                    selectedAddImageBase64 = val;
                    if(addFileText) addFileText.innerText = "Direct External URL loaded.";
                }
            } else if (!selectedAddImageBase64) {
                addPreviewImg.style.display = 'none';
            }
        });
    }

    if (addFileInput) {
        addFileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                if(addFileText) addFileText.innerText = "Processing & Compressing...";
                try {
                    selectedAddImageBase64 = await compressAndGetBase64(file, 800, 0.7);
                    addPreviewImg.src = selectedAddImageBase64;
                    addPreviewImg.style.display = 'block';
                    if(addUrlInput) addUrlInput.value = ''; 
                    if(addFileText) addFileText.innerText = "Selected & Compressed: " + file.name;
                } catch (error) {
                    if(addFileText) addFileText.innerText = "Error processing image";
                    selectedAddImageBase64 = null;
                }
            } else {
                if(addFileText) addFileText.innerText = "No photo selected";
            }
        });
    }

    if (editUrlInput) {
        editUrlInput.addEventListener('input', async function() {
            let val = editUrlInput.value.trim();
            if (val !== '') {
                val = convertDriveLink(val);
                if (editFileText) editFileText.innerText = "Processing Edit URL...";
                try {
                    selectedEditImageBase64 = await compressAndGetBase64(val, 800, 0.7);
                    editPreviewImg.src = selectedEditImageBase64;
                    if(editFileInput) editFileInput.value = ''; 
                    if(editFileText) editFileText.innerText = "Edit URL Compressed!";
                } catch(e) {
                    editPreviewImg.src = val;
                    selectedEditImageBase64 = val;
                    if(editFileText) editFileText.innerText = "Direct Edit URL Loaded.";
                }
            }
        });
    }

    if (editFileInput) {
        editFileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                if(editFileText) editFileText.innerText = "Processing & Compressing...";
                try {
                    selectedEditImageBase64 = await compressAndGetBase64(file, 800, 0.7);
                    editPreviewImg.src = selectedEditImageBase64; 
                    if(editUrlInput) editUrlInput.value = ''; 
                    if(editFileText) editFileText.innerText = "Selected & Compressed: " + file.name;
                } catch (error) {
                    if(editFileText) editFileText.innerText = "Error processing image";
                    selectedEditImageBase64 = null;
                }
            } else {
                if(editFileText) editFileText.innerText = "No photo selected";
            }
        });
    }
}

// ==========================================
// 6. LIVE GLOBAL PRODUCT ADD SYSTEM
// ==========================================
const addProductForm = document.getElementById('addProductForm');
if (addProductForm) {
    addProductForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const name = document.getElementById('prodName').value.trim();
        const rawPrice = document.getElementById('prodPrice').value;
        const weightValue = document.getElementById('prodWeight').value.trim();
        const unit = document.getElementById('prodUnit').value; 
        const category = document.getElementById('prodCategory').value; 
        let urlImage = document.getElementById('prodImage').value.trim();
        
        if(!category) {
            alert('Please select or create a Category Group first!');
            return;
        }

        const dynamicUnitString = weightValue ? `${weightValue} ${unit}` : unit;
        
        // 🔥 PRICE OPTIONAL ENGINE CONDITIONAL CHECK HERE
        let finalPriceString = "";
        if (!rawPrice || rawPrice.trim() === "") {
            finalPriceString = "Price On Call"; // Blank chhodne par ye automatic database me jayega
        } else {
            finalPriceString = '₹' + rawPrice + ' / ' + dynamicUnitString;
        }

        const wholesalePriceInput = document.getElementById('prodWholesalePrice').value;
        const finalWholesaleString = wholesalePriceInput ? '₹' + wholesalePriceInput + ' / ' + dynamicUnitString : '';

        urlImage = convertDriveLink(urlImage);
        let finalImage = NO_IMAGE_URL;
        if (selectedAddImageBase64) {
            finalImage = selectedAddImageBase64;
        } else if (urlImage !== '') {
            finalImage = urlImage;
        }

        const productObject = {
            name: name,
            price: finalPriceString,
            wholesalePrice: finalWholesaleString, 
            image: finalImage,
            category: category
        };

        const submitBtn = addProductForm.querySelector('button[type="submit"]');
        submitBtn.innerText = 'Publishing...';
        submitBtn.disabled = true;

        fetch(`${DB_URL}/products.json`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productObject)
        })
        .then(() => {
            addProductForm.reset();
            document.getElementById('imagePreview').style.display = 'none';
            document.getElementById('dropdownSelectedValue').innerText = '-- Choose Category --';
            selectedAddImageBase64 = null;
            filterProducts(); 
            alert('Product Published Globally!');
        })
        .catch(() => {
            alert('Error updating database!');
        })
        .finally(() => {
            submitBtn.innerText = 'Publish Product';
            submitBtn.disabled = false;
        });
    });
}

// ==========================================
// 7. RENDER LIVE ITEMS FROM CLOUD
// ==========================================
function filterProducts() {
    const productsGrid = document.getElementById('productsGrid');
    if (!productsGrid) return;

    const searchBar = document.getElementById('searchBar');
    const searchText = searchBar ? searchBar.value.toLowerCase().trim() : '';
    
    productsGrid.innerHTML = `
        <div class="spinner-container">
            <div class="loading-spinner"></div>
            <p class="spinner-text">Loading live items, please wait...</p>
        </div>
    `;

    fetch(`${DB_URL}/products.json`)
    .then(res => res.json())
    .then(data => {
        productsGrid.innerHTML = ''; 

        if (!data) {
            productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#999;">No products found.</p>';
            return;
        }

        let productsList = Object.keys(data).map(key => {
            return { id: key, ...data[key] };
        }).reverse();

        const filteredList = productsList.filter(product => {
            const matchesCategory = (currentCategory === 'All' || product.category === currentCategory);
            const matchesSearch = product.name.toLowerCase().includes(searchText) || 
                                  product.category.toLowerCase().includes(searchText);
            return matchesCategory && matchesSearch;
        });

        if (filteredList.length === 0) {
            productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#999;">No products found.</p>';
            return;
        }

        filteredList.forEach((product) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const safeName = product.name.replace(/'/g, "\\'").replace(/"/g, '"');
            const safePrice = product.price.replace(/'/g, "\\'");
            const safeWholesale = product.wholesalePrice ? product.wholesalePrice.replace(/'/g, "\\'") : '';

            let actionHtml = '';
            let wholesaleHtml = '';
            const userRole = localStorage.getItem('userRole') || 'customer';
            
            if (userRole === 'admin') {
                if (product.wholesalePrice) {
                    wholesaleHtml = `<div style="font-size: 13px; color: #ff9800; font-weight: bold; margin-bottom: 5px; background: rgba(255,152,0,0.1); padding: 4px 6px; border-radius: 6px;">📦 Wholesale: ${product.wholesalePrice}</div>`;
                }
                actionHtml = `
                    <div class="admin-action-btns">
                        <button class="edit-btn" onclick="openEditModal('${product.id}', '${safeName}', '${safePrice}', '${safeWholesale}', '${product.category}', '${product.image}')">Edit</button>
                        <button class="delete-btn" onclick="deleteProduct('${product.id}')">Delete</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div onclick="openProductModal('${safeName}', '${safePrice}')" style="width:100%; cursor:pointer;">
                    <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null; this.src='${NO_IMAGE_URL}';">
                    <h4>${product.name}</h4>
                    <div class="price">${product.price}</div>
                    ${wholesaleHtml}
                </div>
                ${actionHtml}
            `;
            productsGrid.appendChild(card);
        });
    })
    .catch(() => {
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#999;">Failed to load live items.</p>';
    });
}

function openProductModal(name, price) {
    document.getElementById('modalProdName').innerText = name + " — " + price;
    document.getElementById('productModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
}

function openEditModal(id, name, priceWithSymbol, wholesaleWithSymbol, category, image) {
    document.getElementById('editProdId').value = id;
    document.getElementById('editProdName').value = name;
    
    let rawPrice = "";
    let weightNum = '';
    let unitStr = 'Piece';

    // Extraction handling check for non-numeric dynamic fields like "Price On Call"
    if (priceWithSymbol.includes(' / ')) {
        const parts = priceWithSymbol.split(' / ');
        rawPrice = parts[0].replace('₹', '').trim();
        const unitParts = parts[1].trim().split(' ');
        if (unitParts.length > 1) {
            weightNum = unitParts[0].trim(); 
            unitStr = unitParts[1].trim();   
        } else {
            unitStr = unitParts[0].trim();
        }
    }
    
    document.getElementById('editProdPrice').value = rawPrice; // Keeps input clear if blank initially
    document.getElementById('editProdWeight').value = weightNum; 
    document.getElementById('editProdUnit').value = unitStr;
    
    if (wholesaleWithSymbol && wholesaleWithSymbol !== 'undefined' && wholesaleWithSymbol.includes(' / ')) {
        const wParts = wholesaleWithSymbol.split(' / ');
        document.getElementById('editProdWholesalePrice').value = wParts[0].replace('₹', '').trim();
    } else {
        document.getElementById('editProdWholesalePrice').value = '';
    }
    
    document.getElementById('editProdCategory').value = category;
    document.getElementById('editImagePreview').src = image;
    document.getElementById('editProdImage').value = '';
    selectedEditImageBase64 = null;

    document.getElementById('editProductModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editProductModal').style.display = 'none';
}

function submitProductEdit() {
    const id = document.getElementById('editProdId').value;
    const name = document.getElementById('editProdName').value.trim();
    const rawPrice = document.getElementById('editProdPrice').value;
    const weightValue = document.getElementById('editProdWeight').value.trim();
    const unit = document.getElementById('editProdUnit').value;
    const category = document.getElementById('editProdCategory').value;
    let editUrlImage = document.getElementById('editProdImage').value.trim();
    const currentImageUrl = document.getElementById('editImagePreview').src; 

    if (!name) {
        alert("Please fill the product name.");
        return;
    }

    const dynamicUnitString = weightValue ? `${weightValue} ${unit}` : unit;
    
    // 🔥 EDIT CONDITIONAL PATTERN
    let finalPriceString = "";
    if (!rawPrice || rawPrice.trim() === "") {
        finalPriceString = "Price On Call";
    } else {
        finalPriceString = '₹' + rawPrice + ' / ' + dynamicUnitString;
    }

    const wholesaleInput = document.getElementById('editProdWholesalePrice').value;
    const finalWholesaleString = wholesaleInput ? '₹' + wholesaleInput + ' / ' + dynamicUnitString : '';

    editUrlImage = convertDriveLink(editUrlImage);
    let finalImage = currentImageUrl;
    if (selectedEditImageBase64) {
        finalImage = selectedEditImageBase64;
    } else if (editUrlImage !== '') {
        finalImage = editUrlImage;
    }

    const updatedProduct = {
        name: name,
        price: finalPriceString,
        wholesalePrice: finalWholesaleString,
        image: finalImage,
        category: category
    };

    const editBtn = document.querySelector('#editProductModal .publish-submit-btn');
    editBtn.innerText = 'Saving...';
    editBtn.disabled = true;

    fetch(`${DB_URL}/products/${id}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProduct)
    })
    .then(() => {
        closeEditModal();
        filterProducts(); 
        alert('Product Updated Successfully!');
    })
    .catch(() => {
        alert('Error updating database!');
    })
    .finally(() => {
        editBtn.innerText = 'Save Changes';
        editBtn.disabled = false;
    });
}

function deleteProduct(id) {
    if (confirm('Delete this item from global cloud?')) {
        fetch(`${DB_URL}/products/${id}.json`, { method: 'DELETE' })
        .then(() => { filterProducts(); });
    }
}

// Hooks registration
window.logout = logout;
window.createNewCategory = createNewCategory;
window.selectCategory = selectCategory;
window.filterProducts = filterProducts;
window.openProductModal = openProductModal;
window.closeModal = closeModal;
window.deleteProduct = deleteProduct;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.submitProductEdit = submitProductEdit;

window.addEventListener('load', function() {
    const pageLoader = document.getElementById('pageLoader');
    if (pageLoader) pageLoader.style.display = 'none';
});