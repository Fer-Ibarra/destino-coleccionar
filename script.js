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
    }, handleFirestoreError);

    db.collection("meetings").onSnapshot((snapshot) => {
        meetings = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
        renderCalendar();
        renderPlaces();
    }, handleFirestoreError);
};

function handleFirestoreError(error) {
    console.error('Firestore:', error);
    alert(`No se pudo guardar o cargar la información: ${error.message}`);
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    if(modalId === 'meeting-modal') {
        updateLocationSelect();
        resetMeetingLocations();
    }
}
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'meeting-modal') resetMeetingForm();
    if (modalId === 'place-modal') resetPlaceForm();
}

function resetMeetingForm() {
    const form = document.getElementById('meeting-form');
    form.reset();
    document.getElementById('m-time-mm').value = '00';
    resetMeetingLocations();
}

function resetPlaceForm() {
    const form = document.getElementById('place-form');
    form.reset();
    document.getElementById('p-category').value = '';
    document.getElementById('p-selected-chips').innerHTML = '';
    document.getElementById('menu-upload-group').style.display = 'none';
    document.getElementById('file-names-display').textContent = 'Ningún archivo seleccionado';
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
    const locationIndex = arguments.length > 1 ? arguments[0] : 1;
    const selectedValue = arguments.length > 1 ? arguments[1] : value;
    const customFields = document.getElementById(`custom-destination-fields-${locationIndex}`) || document.getElementById('custom-destination-fields-1');
    const isCustom = selectedValue === 'custom-destination';
    customFields.style.display = isCustom ? 'block' : 'none';
    customFields.querySelectorAll('input').forEach(input => input.required = isCustom);

    if (!isCustom) {
        customFields.querySelectorAll('input, textarea').forEach(input => input.value = '');
    }
}

function resetMeetingLocations() {
    const container = document.getElementById('meeting-locations');
    container.innerHTML = `<div class="location-row">
        <label for="m-location-1">Lugar 1</label>
        <select id="m-location-1" class="meeting-location" required onchange="toggleCustomDestinationFields(1, this.value)">
            <option value="">Selecciona un lugar...</option>
        </select>
        <div id="custom-destination-fields-1" class="custom-destination-fields" style="display:none;">
            <input type="text" class="custom-name" id="m-custom-name" placeholder="Nombre del lugar">
            <input type="url" class="custom-link" id="m-custom-link" placeholder="https://maps.google.com/...">
            <textarea class="custom-reference" id="m-custom-reference" rows="2" placeholder="Referencia"></textarea>
        </div>
    </div>`;
    updateLocationSelect();
}

function addMeetingLocation() {
    const container = document.getElementById('meeting-locations');
    const locationIndex = container.querySelectorAll('.location-row').length + 1;
    const row = document.createElement('div');
    row.className = 'location-row';
    row.innerHTML = `<label for="m-location-${locationIndex}">Lugar ${locationIndex}</label>
        <select id="m-location-${locationIndex}" class="meeting-location" required onchange="toggleCustomDestinationFields(${locationIndex}, this.value)">
            ${locationOptionsHtml()}
        </select>
        <div id="custom-destination-fields-${locationIndex}" class="custom-destination-fields" style="display:none;">
            <input type="text" class="custom-name" placeholder="Nombre del lugar">
            <input type="url" class="custom-link" placeholder="https://maps.google.com/...">
            <textarea class="custom-reference" rows="2" placeholder="Referencia"></textarea>
        </div>`;
    container.appendChild(row);
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
    const priceMin = document.getElementById('p-price-min').value.trim();
    const priceMax = document.getElementById('p-price-max').value.trim();
    const price = priceMin || priceMax ? `$${priceMin || 0}-$${priceMax || priceMin || 0}` : '';
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
                resizeImage(uploadEvent.target.result).then(image => {
                    menuImages.push(image);
                    filesProcessed++;
                    if(filesProcessed === fileInput.files.length) {
                        finishSavingPlace(name, category, price, link, autoPhoto, reference, menuImages);
                    }
                });
            };
            reader.readAsDataURL(file);
        });
    } else {
        finishSavingPlace(name, category, price, link, autoPhoto, reference, []);
    }
}

function resizeImage(dataUrl) {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            const maxSize = 1000;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        image.src = dataUrl;
    });
}

async function finishSavingPlace(name, category, price, link, photo, reference, menuImages) {
    const newPlace = {
        id: Date.now(),
        name, category, price, link, photo, reference, menuImages,
        priceMin, priceMax
    };

    db.collection("places").add(newPlace).then(() => {
        closeModal('place-modal');
    }).catch(handleFirestoreError);
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
        let placeMeetings = meetings.filter(m => meetingLocations(m).some(location => location.locationId == place.id));
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
                    <p><b>Categoría:</b> ${place.category} | <b>Precio:</b> ${formatPrice(place)}</p>
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
    document.querySelectorAll('.meeting-location').forEach(select => {
        select.innerHTML = locationOptionsHtml();
    });
}

function locationOptionsHtml() {
    return '<option value="">Selecciona un lugar...</option>' +
        places.map(p => `<option value="${p.id}">${p.name} (${p.category})</option>`).join('') +
        '<option value="custom-destination">Destino diferente</option>';
}

async function saveMeeting(e) {
    e.preventDefault();
    const date = document.getElementById('m-date').value;
    const hh = document.getElementById('m-time-hh').value.padStart(2, '0');
    const mm = document.getElementById('m-time-mm').value.padStart(2, '0');
    const time = `${hh}:${mm}`;
    const ampm = document.getElementById('m-ampm').value;
    const locations = [];
    for (const row of document.querySelectorAll('.location-row')) {
        const select = row.querySelector('.meeting-location');
        const locationId = select.value;
        if (!locationId) return;
        let customLocation = null;
        if (locationId === 'custom-destination') {
            const name = row.querySelector('.custom-name, #m-custom-name').value.trim();
            const link = row.querySelector('.custom-link, #m-custom-link').value.trim();
            const reference = row.querySelector('.custom-reference, #m-custom-reference').value.trim();
            if (!name || !link) {
                alert(`Completa el nombre y el link de Google Maps del Lugar ${locations.length + 1}.`);
                return;
            }
            customLocation = { name, link, reference };
        }
        locations.push({ locationId, customLocation });
    }

    const newMeeting = {
        id: Date.now(),
        title: 'Itinerario', date, time, ampm, locations,
        locationId: locations[0].locationId,
        customLocation: locations[0].customLocation
    };

    db.collection("meetings").add(newMeeting).then(() => {
        closeModal('meeting-modal');
    }).catch(handleFirestoreError);
}

function openEventDetails(firebaseId) {
    selectedEventId = firebaseId;
    const meeting = meetings.find(m => m.firebaseId === firebaseId);
    document.getElementById('det-title').textContent = `${formatDate(meeting.date)} · ${meeting.time} ${meeting.ampm}`;
    const routeLocations = meetingLocations(meeting);
    const locationText = routeLocations.map((location, index) => {
        if (location.customLocation) return `<div class="itinerary-place"><div><b>Lugar ${index + 1}:</b> ${location.customLocation.name}<p><a href="${location.customLocation.link}" target="_blank">Ver en Google Maps 📍</a></p>${location.customLocation.reference ? `<p><b>Ref:</b> ${location.customLocation.reference}</p>` : ''}</div><span class="itinerary-category">Destino diferente</span></div>`;
        const place = places.find(p => p.id == location.locationId);
        if (!place) return `<div class="itinerary-place"><b>Lugar ${index + 1}:</b> Destino no disponible</div>`;
        return `<div class="itinerary-place"><div><b>Lugar ${index + 1}:</b> ${place.name}<p><b>Precio:</b> ${formatPrice(place)}</p><p><a href="${place.link}" target="_blank">Ver en Google Maps 📍</a></p></div><span class="itinerary-category">${place.category}</span></div>`;
    }).join('');

    document.getElementById('det-content').innerHTML = `
        ${locationText}
    `;
    openModal('event-detail-modal');
}

function formatPrice(place) {
    if (place.priceMin || place.priceMax) return `$${place.priceMin || 0}-$${place.priceMax || place.priceMin || 0}`;
    return place.price ? place.price.replace(/\s+/g, '') : 'Sin precio indicado';
}

function meetingLocations(meeting) {
    return meeting.locations && meeting.locations.length ? meeting.locations : [{
        locationId: meeting.locationId,
        customLocation: meeting.customLocation
    }];
}

function formatDate(dateString) {
    return new Date(`${dateString}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
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

