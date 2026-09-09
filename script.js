const firebaseConfig = {
    apiKey: "AIzaSyBDpUB8CZjs0IINtGtJGUCucg7SIFZAF54",
    authDomain: "datos-lugares.firebaseapp.com",
    projectId: "datos-lugares",
    storageBucket: "datos-lugares.firebasestorage.app",
    messagingSenderId: "152177697237",
    appId: "1:152177697237:web:8a8349ba583e724d709d5c",
    measurementId: "G-DYK2CYE3R6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let places = [];
let meetings = [];
let currentDate = new Date();
let selectedEventId = null;

window.onload = function() {
    db.collection("places").onSnapshot((snapshot) => {
        places = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        renderPlaces();
        updateLocationSelect();
        renderCalendar();
    });

    db.collection("meetings").onSnapshot((snapshot) => {
        meetings = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        renderCalendar();
        renderPlaces();
    });
};

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    if(modalId === 'meeting-modal') updateLocationSelect();
}
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function updateFileName(input) {
    const display = document.getElementById('file-names-display');
    if (input.files.length > 0) {
        if (input.files.length === 1) {
            display.textContent = `1 archivo seleccionado: ${input.files[0].name}`;
        } else {
            display.textContent = `${input.files.length} archivos seleccionados`;
        }
    } else {
        display.textContent = 'Ningún archivo seleccionado';
    }
}

function selectCategory(value) {
    if(!value) return;
    document.getElementById('p-category').value = value;
    const container = document.getElementById('p-selected-chips');
    container.innerHTML = `<span class="chip">${value} ✕</span>`;
    toggleMenuUpload();
}

function toggleMenuUpload() {
    const category = document.getElementById('p-category').value;
    const menuGroup = document.getElementById('menu-upload-group');
    const shouldShow = category === 'Café' || category === 'Restaurante';
    menuGroup.style.display = shouldShow ? 'block' : 'none';

    if (!shouldShow) {
        const fileInput = document.getElementById('p-menu-files');
        fileInput.value = '';
        document.getElementById('file-names-display').textContent = 'Ningún archivo seleccionado';
    }
}

function toggleCustomDestinationFields(value) {
    const customFields = document.getElementById('custom-destination-fields');
    const isCustom = value === 'custom-destination';
    customFields.style.display = isCustom ? 'block' : 'none';

    if (!isCustom) {
        document.getElementById('m-custom-name').value = '';
        document.getElementById('m-custom-link').value = '';
        document.getElementById('m-custom-reference').value = '';
    }
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthsNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    document.getElementById('month-year-display').textContent = `${monthsNames[month]} ${year}`;

    const daysGrid = document.getElementById('days-grid');
    daysGrid.innerHTML = '';

    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(year, month + 1, 0).getDate();

    for(let i = 0; i < firstDayIndex; i++) {
        let emptyCell = document.createElement('div');
        daysGrid.appendChild(emptyCell);
    }

    for(let day = 1; day <= totalDays; day++) {
        let cell = document.createElement('div');
        cell.className = 'day-cell';
        
        let formattedMonth = String(month + 1).padStart(2, '0');
        let formattedDay = String(day).padStart(2, '0');
        let dateString = `${year}-${formattedMonth}-${formattedDay}`;

        cell.innerHTML = `<span>${day}</span>`;

        let meeting = meetings.find(m => m.date === dateString);
        if(meeting) {
            cell.classList.add('has-event');
            cell.innerHTML += `<span class="heart-indicator">♥</span>`;
            cell.onclick = () => openEventDetails(meeting.firebaseId);
        }

        daysGrid.appendChild(cell);
    }
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

function savePlace(e) {
    e.preventDefault();
    const name = document.getElementById('p-name').value;
    const category = document.getElementById('p-category').value;
    const price = document.getElementById('p-price').value;
    const link = document.getElementById('p-link').value;
    const reference = document.getElementById('p-reference').value;
    const fileInput = document.getElementById('p-menu-files');

    let autoPhoto = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80";
    if(category === "Café") autoPhoto = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80";
    if(category === "Galería de arte") autoPhoto = "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?auto=format&fit=crop&w=300&q=80";

    let menuImages = [];
    if(fileInput.files.length > 0) {
        let filesProcessed = 0;
        Array.from(fileInput.files).forEach((file) => {
            const reader = new FileReader();
            reader.onload = function(uploadEvent) {
                menuImages.push(uploadEvent.target.result);
                filesProcessed++;
                if(filesProcessed === fileInput.files.length) {
                    finishSavingPlace(name, category, price, link, autoPhoto, reference, menuImages);
                }
            };
            reader.readAsDataURL(file);
        });
    } else {
        finishSavingPlace(name, category, price, link, autoPhoto, reference, []);
    }
}

function finishSavingPlace(name, category, price, link, photo, reference, menuImages) {
    const newPlace = {
        id: Date.now(),
        name, category, price, link, photo, reference, menuImages
    };

    db.collection("places").add(newPlace).then(() => {
        document.getElementById('place-form').reset();
        document.getElementById('p-selected-chips').innerHTML = '';
        document.getElementById('file-names-display').textContent = 'Ningún archivo seleccionado';
        closeModal('place-modal');
    });
}

function deletePlace(firebaseId, placeId) {
    if(confirm("¿Estás seguro de que deseas eliminar este lugar? Se desvincularán sus reuniones asociadas.")) {
        db.collection("places").doc(firebaseId).delete().then(() => {
            let associatedMeetings = meetings.filter(m => m.locationId == placeId);
            associatedMeetings.forEach(m => {
                db.collection("meetings").doc(m.firebaseId).delete();
            });
        });
    }
}

function renderPlaces() {
    const listContainer = document.getElementById('places-list');
    listContainer.innerHTML = '';

    if(places.length === 0) {
        listContainer.innerHTML = '<p style="color:#777; text-align:center;">Aún no hay lugares coleccionados.</p>';
        return;
    }

    places.forEach(place => {
        let placeMeetings = meetings.filter(m => m.locationId == place.id);
        let status = "Pendiente";
        let statusClass = "status-pendiente";

        if(placeMeetings.length > 0) {
            let now = new Date();
            let passed = placeMeetings.some(m => new Date(`${m.date}T${convertTo24(m.time, m.ampm)}`) < now);
            if(passed) {
                status = "Misión cumplida";
                statusClass = "status-cumplida";
            }
        }

        let card = document.createElement('div');
        card.className = 'place-card';
        card.innerHTML = `
            <button class="btn-delete-place" onclick="deletePlace('${place.firebaseId}', ${place.id})" title="Eliminar lugar">✕</button>
            <div class="place-header">
                <span class="place-title">${place.name}</span>
                <span class="status-badge ${statusClass}">${status}</span>
            </div>
            <div style="display: flex; gap: 15px;">
                <img src="${place.photo}" alt="${place.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                <div class="place-details" style="flex:1;">
                    <p><b>Categoría:</b> ${place.category} | <b>Precio:</b> ${place.price}</p>
                    <p><b>Ref:</b> ${place.reference || 'Sin referencias'}</p>
                    <p><a href="${place.link}" target="_blank" style="color:var(--primary-color);">Ver en Google Maps 📍</a></p>
                </div>
            </div>
            ${place.menuImages && place.menuImages.length > 0 ? `
                <div>
                    <p style="font-size:0.8rem; font-weight:bold; margin: 5px 0;">Menú:</p>
                    <div class="menu-preview">
                        ${place.menuImages.map(img => `<img src="${img}" onclick="openImageViewer('${img}')">`).join('')}
                    </div>
                </div>
            ` : ''}
        `;
        listContainer.appendChild(card);
    });
}

function updateLocationSelect() {
    const select = document.getElementById('m-location');
    if(!select) return;
    select.innerHTML = '<option value="">Selecciona un lugar...</option>';
    places.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.name} (${p.category})</option>`;
    });
    select.innerHTML += '<option value="custom-destination">Destino diferente</option>';
}

function saveMeeting(e) {
    e.preventDefault();
    const title = document.getElementById('m-title').value;
    const date = document.getElementById('m-date').value;
    const hh = document.getElementById('m-time-hh').value.padStart(2, '0');
    const mm = document.getElementById('m-time-mm').value.padStart(2, '0');
    const time = `${hh}:${mm}`;
    const ampm = document.getElementById('m-ampm').value;
    const locationId = document.getElementById('m-location').value;

    let customLocation = null;
    if (locationId === 'custom-destination') {
        const name = document.getElementById('m-custom-name').value.trim();
        const link = document.getElementById('m-custom-link').value.trim();
        const reference = document.getElementById('m-custom-reference').value.trim();

        if (!name || !link) {
            alert('Completa el nombre y el link de Google Maps del destino diferente.');
            return;
        }

        customLocation = { name, link, reference };
    }

    const newMeeting = {
        id: Date.now(),
        title, date, time, ampm, locationId,
        customLocation
    };

    db.collection("meetings").add(newMeeting).then(() => {
        document.getElementById('meeting-form').reset();
        document.getElementById('m-time-mm').value = "00";
        document.getElementById('custom-destination-fields').style.display = 'none';
        closeModal('meeting-modal');
    });
}

function openEventDetails(firebaseId) {
    selectedEventId = firebaseId;
    const meeting = meetings.find(m => m.firebaseId === firebaseId);
    const place = places.find(p => p.id == meeting.locationId);

    document.getElementById('det-title').textContent = meeting.title;
    const isCustom = meeting.locationId === 'custom-destination';

    let locationText = 'Ubicación externa';
    let referenceText = '';

    if (isCustom && meeting.customLocation) {
        locationText = meeting.customLocation.name;
        referenceText = meeting.customLocation.reference ? `<p><b>Ref:</b> ${meeting.customLocation.reference}</p>` : '';
        locationText = `<a href="${meeting.customLocation.link}" target="_blank" style="color:var(--primary-color);">${meeting.customLocation.name} 📍</a>`;
    } else if (place) {
        locationText = place.name;
        referenceText = `<p><b>Ref del lugar:</b> ${place.reference || 'Sin referencias'}</p>`;
    }

    document.getElementById('det-content').innerHTML = `
        <p><b>📅 Fecha:</b> ${meeting.date}</p>
        <p><b>⏰ Hora:</b> ${meeting.time} ${meeting.ampm}</p>
        <p><b>📍 Lugar:</b> ${locationText}</p>
        ${referenceText}
    `;
    openModal('event-detail-modal');
}

function deleteMeeting() {
    if(!selectedEventId) return;
    db.collection("meetings").doc(selectedEventId).delete().then(() => {
        closeModal('event-detail-modal');
        selectedEventId = null;
    });
}

function convertTo24(timeStr, ampm) {
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours);
    if(ampm === 'PM' && hours < 12) hours += 12;
    if(ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
}

function openImageViewer(url) {
    document.getElementById('full-img').src = url;
    openModal('image-viewer-modal');
}
