// ==========================================
// 1. GLOBAL LIVE CLOUD DATABASE CONFIGURATION
// ==========================================
const DB_URL = "https://sahu-hotel-app-default-rtdb.firebaseio.com";

let currentCategory = 'All';
let DEFAULT_CATEGORIES = ['Hotel', 'Kirana', 'Dairy', 'Snacks'];
let cloudCategoryMap = {}; // Naya variable delete karne ke liye

const NO_IMAGE_URL = 'https://images.placeholders.dev/?width=150&height=150&text=No%20Image';

let selectedAddImageBase64 = null;
let selectedEditImageBase64 = null;
// ==========================================
// 2. LIVE LOGIN & REGISTER SYSTEM (GLOBAL)
// ==========================================
const loginForm = document.getElementById('loginForm');

if (loginForm) {
    // 🛑 NAYA FIX: Agar user pehle se login hai, toh turant Home par bhej do
    if (localStorage.getItem('currentUser')) {
        window.location.replace("./home.html");
    }

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
            window.location.replace("./home.html"); // 🛑 NAYA FIX: History replace
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
                    window.location.replace("./home.html"); // 🛑 NAYA FIX: History replace
                });
            } 
            else {
                if (registeredUser.password === pValue) {
                    localStorage.setItem('currentUser', registeredUser.username);
                    localStorage.setItem('userRole', registeredUser.role);
                    alert('Login Successful!');
                    window.location.replace("./home.html"); // 🛑 NAYA FIX: History replace
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
// 3. HOME DASHBOARD PROTECTION & INITIAL LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    if (window.location.pathname.includes('home.html') && !localStorage.getItem('currentUser')) {
        window.location.href = "./index.html";
        return;
    }

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
        DEFAULT_CATEGORIES = ['Hotel', 'Kirana', 'Dairy', 'Snacks']; // Default set
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

function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    window.location.href = "./index.html";
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
    const prodCategoryDropdown = document.getElementById('prodCategory');
    const editProdCategoryDropdown = document.getElementById('editProdCategory'); 
    const deleteCategorySelect = document.getElementById('deleteCategorySelect');
    const tabsContainer = document.getElementById('categoryTabsContainer');

    if (prodCategoryDropdown) {
        prodCategoryDropdown.innerHTML = '';
        DEFAULT_CATEGORIES.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.innerText = cat;
            prodCategoryDropdown.appendChild(option);
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

    if (deleteCategorySelect) {
        deleteCategorySelect.innerHTML = '<option value="">-- Select Category to Delete --</option>';
        Object.keys(cloudCategoryMap).forEach(key => {
            const option = document.createElement('option');
            option.value = key; 
            option.innerText = cloudCategoryMap[key];
            deleteCategorySelect.appendChild(option);
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

function deleteCategory() {
    const select = document.getElementById('deleteCategorySelect');
    if (!select) return;
    const catId = select.value;
    
    if (catId === "") {
        alert("Please select a category to delete.");
        return;
    }

    const catName = cloudCategoryMap[catId];
    if (confirm(`Are you sure you want to permanently delete the category "${catName}"?`)) {
        fetch(`${DB_URL}/categories/${catId}.json`, { method: 'DELETE' })
        .then(() => {
            alert(`Category "${catName}" deleted!`);
            loadCategories(); 
        })
        .catch(() => alert('Error deleting category!'));
    }
}

function selectCategory(categoryName) {
    currentCategory = categoryName;
    renderCategoryElements(); 
    filterProducts(); 
}

// ==========================================
// 5. IMAGE SELECTION & LIVE PREVIEW LOGIC
// ==========================================
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
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
        addUrlInput.addEventListener('input', function() {
            let val = addUrlInput.value.trim();
            if (val !== '') {
                val = convertDriveLink(val);
                addPreviewImg.src = val;
                addPreviewImg.style.display = 'block';
                if(addFileInput) addFileInput.value = ''; 
                if(addFileText) addFileText.innerText = "No photo selected";
                selectedAddImageBase64 = null;
            } else if (!selectedAddImageBase64) {
                addPreviewImg.style.display = 'none';
            }
        });
    }

    if (addFileInput) {
        addFileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 1 * 1024 * 1024) { 
                    alert("⚠️ Photo size 1MB se chhoti honi chahiye!");
                    addFileInput.value = '';
                    if(addFileText) addFileText.innerText = "No photo selected";
                    return;
                }
                if(addFileText) addFileText.innerText = "Selected: " + file.name;
                try {
                    selectedAddImageBase64 = await fileToBase64(file);
                    addPreviewImg.src = selectedAddImageBase64;
                    addPreviewImg.style.display = 'block';
                    if(addUrlInput) addUrlInput.value = ''; 
                } catch (error) {
                    selectedAddImageBase64 = null;
                }
            } else {
                if(addFileText) addFileText.innerText = "No photo selected";
            }
        });
    }
    
    if (editUrlInput) {
        editUrlInput.addEventListener('input', function() {
            let val = editUrlInput.value.trim();
            if (val !== '') {
                val = convertDriveLink(val);
                editPreviewImg.src = val;
                if(editFileInput) editFileInput.value = ''; 
                if(editFileText) editFileText.innerText = "No photo selected";
                selectedEditImageBase64 = null;
            }
        });
    }

    if (editFileInput) {
        editFileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 1 * 1024 * 1024) {
                    alert("⚠️ Photo size 1MB se chhoti honi chahiye!");
                    editFileInput.value = '';
                    if(editFileText) editFileText.innerText = "No photo selected";
                    return;
                }
                if(editFileText) editFileText.innerText = "Selected: " + file.name;
                try {
                    selectedEditImageBase64 = await fileToBase64(file);
                    editPreviewImg.src = selectedEditImageBase64; 
                    if(editUrlInput) editUrlInput.value = ''; 
                } catch (error) {
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
        const unit = document.getElementById('prodUnit').value; 
        const category = document.getElementById('prodCategory').value; 
        let urlImage = document.getElementById('prodImage').value.trim();

        urlImage = convertDriveLink(urlImage);

        let finalImage = NO_IMAGE_URL;
        if (selectedAddImageBase64) {
            finalImage = selectedAddImageBase64;
        } else if (urlImage !== '') {
            finalImage = urlImage;
        }

        const finalPriceString = '₹' + rawPrice + ' / ' + unit;

        const productObject = {
            name: name,
            price: finalPriceString,
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
            const fileText = document.getElementById('fileChosenText');
            if (fileText) fileText.innerText = "No photo selected";
            selectedAddImageBase64 = null;
            filterProducts(); 
            alert('Product Published Globally!');
        })
        .catch((err) => {
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
    productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#6c757d;">Loading live items...</p>';

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
        });

        const filteredList = productsList.filter(product => {
            const matchesCategory = (currentCategory === 'All' || product.category === currentCategory);
            // Search by Name OR Category
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

            let actionHtml = '';
            const userRole = localStorage.getItem('userRole') || 'customer';
            
            if (userRole === 'admin') {
                actionHtml = `
                    <div class="admin-action-btns">
                        <button class="edit-btn" onclick="openEditModal('${product.id}', '${safeName}', '${safePrice}', '${product.category}', '${product.image}')">Edit</button>
                        <button class="delete-btn" style="background: #dc3545; color: white; border: none; padding: 5px; cursor: pointer; width: 50%; border-radius:4px; font-weight:bold; font-size:14px;" onclick="deleteProduct('${product.id}')">Delete</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div onclick="openProductModal('${safeName}', '${safePrice}')" style="width:100%; cursor:pointer;">
                    <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null; this.src='${NO_IMAGE_URL}';">
                    <h4>${product.name}</h4>
                    <div class="price">${product.price}</div>
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

// ==========================================
// 8. PRODUCT MODALS (Customer & Admin Edit)
// ==========================================
function openProductModal(name, price) {
    document.getElementById('modalProdName').innerText = name + " — " + price;
    document.getElementById('productModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('productModal').style.display = 'none';
}

function openEditModal(id, name, priceWithSymbol, category, image) {
    document.getElementById('editProdId').value = id;
    document.getElementById('editProdName').value = name;
    
    const parts = priceWithSymbol.split(' / ');
    const rawPrice = parts[0].replace('₹', '').trim();
    const unit = parts.length > 1 ? parts[1].trim() : 'Piece';
    
    document.getElementById('editProdPrice').value = rawPrice;
    document.getElementById('editProdUnit').value = unit;
    
    document.getElementById('editProdCategory').value = category;
    document.getElementById('editImagePreview').src = image;
    
    document.getElementById('editProdImage').value = '';
    document.getElementById('editProdImageFile').value = '';
    const fileText = document.getElementById('editFileChosenText');
    if (fileText) fileText.innerText = "No photo selected";
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
    const unit = document.getElementById('editProdUnit').value;
    const category = document.getElementById('editProdCategory').value;
    let editUrlImage = document.getElementById('editProdImage').value.trim();
    const currentImageUrl = document.getElementById('editImagePreview').src; 

    if (!name || !rawPrice) {
        alert("Please fill name and price.");
        return;
    }

    editUrlImage = convertDriveLink(editUrlImage);

    let finalImage = currentImageUrl;
    if (selectedEditImageBase64) {
        finalImage = selectedEditImageBase64;
    } else if (editUrlImage !== '') {
        finalImage = editUrlImage;
    }

    const finalPriceString = '₹' + rawPrice + ' / ' + unit;

    const updatedProduct = {
        name: name,
        price: finalPriceString,
        image: finalImage,
        category: category
    };

    const editBtn = document.querySelector('#editProductModal .add-btn');
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
        .then(() => {
            filterProducts();
        });
    }
}

// Global System Pipeline Hooks
window.logout = logout;
window.createNewCategory = createNewCategory;
window.deleteCategory = deleteCategory;
window.selectCategory = selectCategory;
window.filterProducts = filterProducts;
window.openProductModal = openProductModal;
window.closeModal = closeModal;
window.deleteProduct = deleteProduct;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.submitProductEdit = submitProductEdit;