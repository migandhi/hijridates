// calendar.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const calendarBody = document.getElementById('calendar-body');
    const currentMonthElement = document.getElementById('current-hijri-month');
    const currentYearElement = document.getElementById('current-hijri-year');
    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');
    const prevYearButton = document.getElementById('prev-year');
    const nextYearButton = document.getElementById('next-year');
    const todayButton = document.getElementById('today-button');
    const miqaatPopup = document.getElementById('miqaat-popup');
    const popupBackdrop = document.getElementById('popup-backdrop');
    const popupCloseButton = document.getElementById('popup-close');
    const popupDateElement = document.getElementById('popup-date');
    const popupContentElement = document.getElementById('popup-content');

    // --- State ---
    let currentHijriYear;
    let currentHijriMonth;
    let miqaatsData = []; // To hold the fetched miqaats JSON

    // --- Constants ---
    const ARABIC_NUMERALS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const GREGORIAN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MIQAATS_JSON_PATH = 'miqaats.json'; // Path to your JSON file

    // --- Helper Functions ---

    function toArabicNumerals(number) {
        if (number === null || typeof number === 'undefined') return '';
        return String(number).split('').map(digit => ARABIC_NUMERALS[parseInt(digit)] || '').join('');
    }

    function formatGregorianDate(gDate, isFirstInGrid, gridStartDate) {
        const day = gDate.getDate();
        const month = gDate.getMonth();
        const year = gDate.getFullYear();
        const today = new Date();
        today.setHours(0,0,0,0);
        const currentYear = today.getFullYear();

        if (isFirstInGrid) {
             if (year !== gridStartDate.getFullYear() || year !== currentYear) {
                 return `${day} ${GREGORIAN_MONTHS_SHORT[month]} ${year}`;
             } else {
                 return `${day} ${GREGORIAN_MONTHS_SHORT[month]}`;
             }
        }
        if (day === 1) {
            return `${day} ${GREGORIAN_MONTHS_SHORT[month]}`;
        }
        return String(day);
    }

     // Function to load Miqaats data asynchronously
    async function loadMiqaats() {
        try {
            const response = await fetch(MIQAATS_JSON_PATH);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            miqaatsData = await response.json();
            console.log("Miqaats data loaded successfully from", MIQAATS_JSON_PATH);
            if (!Array.isArray(miqaatsData) || miqaatsData.length === 0) {
                console.warn("Miqaats data file is empty or invalid.");
                // Decide how to handle this - maybe show a specific error?
                throw new Error("Miqaats data is empty or invalid.");
            }
        } catch (error) {
            console.error("Error loading or parsing miqaats data:", error);
            miqaatsData = []; // Ensure it's an empty array on error
            calendarBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: red; padding: 20px;">Error loading essential miqaats data. Calendar functionality may be limited. Please try refreshing.</td></tr>';
            // Rethrow the error to stop initialization if data is critical
            throw error;
        }
    }

    // Function to find the *highest priority* miqaat level for a given Hijri date's icon
        // UPDATED Function to find the highest priority miqaat level, including night events and removing Eid exception
           // CORRECTED for "Year X onwards" logic
       // UPDATED to return priority AND phase of highest priority event
       function getMiqaatIndicatorInfo(hYear, hMonth, hDay) {
        let highestPriority = 4;
        let phaseOfHighest = null; // 'day' or 'night'

        const relevantEntries = miqaatsData.filter(entry =>
            entry.month === hMonth && entry.date === hDay
        );

        relevantEntries.forEach(entry => {
            if (entry.miqaats && Array.isArray(entry.miqaats)) {
                entry.miqaats.forEach(miqaat => {
                    const isYearApplicable = (miqaat.year === null || (miqaat.year !== null && hYear >= miqaat.year));

                    if (isYearApplicable) {
                         const currentMiqaatPriority = parseInt(miqaat.priority);
                         if (!isNaN(currentMiqaatPriority) && currentMiqaatPriority >= 1 && currentMiqaatPriority < highestPriority) {
                            highestPriority = currentMiqaatPriority;
                            phaseOfHighest = miqaat.phase; // Store the phase of this new highest priority event
                        }
                         // If priorities are equal, we could add logic here, but usually,
                         // the first one encountered with the highest priority is sufficient for icon display.
                    }
                });
            }
        });

        if (highestPriority <= 3) {
            // Return an object with info, or null if no relevant miqaat found
            return { priority: highestPriority, phase: phaseOfHighest };
        } else {
            return null; // No icon needed
        }
    }


    // --- Main Rendering Function ---
    function renderCalendar(hijriYear, hijriMonth) {
        if (typeof HijriDate === 'undefined') {
            console.error("HijriDate library not loaded.");
            calendarBody.innerHTML = '<tr><td colspan="7">Error: Date library missing.</td></tr>';
            return;
        }
        // Basic check if data is available (should be guaranteed by async init)
        if (!Array.isArray(miqaatsData) || miqaatsData.length === 0) {
             console.error("Attempted to render calendar without miqaats data.");
             // Error message should already be present from loadMiqaats failure
            return;
        }

        currentHijriYear = hijriYear;
        currentHijriMonth = hijriMonth;

        currentYearElement.textContent = `${hijriYear}H`;
        currentMonthElement.textContent = HijriDate.getMonthName(hijriMonth);

        const firstHijriDate = new HijriDate(hijriYear, hijriMonth, 1);
        const firstGregorianDateOfMonth = firstHijriDate.toGregorian();
        const dayOfWeekStart = firstGregorianDateOfMonth.getDay();

        const startDate = new Date(firstGregorianDateOfMonth);
        startDate.setDate(startDate.getDate() - dayOfWeekStart);
        startDate.setHours(0, 0, 0, 0);

        const todayGregorian = new Date();
        todayGregorian.setHours(0, 0, 0, 0);

        let html = '';
        const gridDate = new Date(startDate);

        for (let i = 0; i < 6; i++) {
            html += '<tr>';
        
        for (let j = 0; j < 7; j++) {
            const cellGregorianDate = new Date(gridDate);
            // Ensure time is normalized for comparison
            cellGregorianDate.setHours(0, 0, 0, 0); // Add normalization here too

            const cellHijriDate = HijriDate.fromGregorian(cellGregorianDate); // Use normalized date for Hijri conversion too
            const hDay = cellHijriDate.getDate();
            const hMonth = cellHijriDate.getMonth();
            const hYear = cellHijriDate.getYear();


            const isCurrentMonth = (hMonth === hijriMonth && hYear === hijriYear);
            // --- CORRECTED LOGIC ---
            // Compare cell date with the actual todayGregorian date (already normalized)
            const isToday = cellGregorianDate.getTime() === todayGregorian.getTime();
            // --- END CORRECTED LOGIC ---
            const isFirstInGrid = (i === 0 && j === 0);

            const classes = ['calendar-day'];
            if (!isCurrentMonth) classes.push('other-month');
            // --- CORRECTED LOGIC ---
            // Highlight if it's the actual current date
            if (isToday) classes.push('today');
            // --- END CORRECTED LOGIC ---

                const gregorianDateStr = formatGregorianDate(cellGregorianDate, isFirstInGrid, startDate);
                const hijriDateStr = toArabicNumerals(hDay);
                const gregorianDataAttr = `${cellGregorianDate.getFullYear()}-${String(cellGregorianDate.getMonth() + 1).padStart(2, '0')}-${String(cellGregorianDate.getDate()).padStart(2, '0')}`;

                               // --- NEW ICON GENERATION ---
                               const indicatorInfo = getMiqaatIndicatorInfo(hYear, hMonth, hDay); // Use the new function
                               let indicatorHtml = '';
                               if (indicatorInfo) {
                                   let iconClass = 'indicator-icon';
                                   // Add night class OR priority class
                                   if (indicatorInfo.phase === 'night') {
                                       iconClass += ' miqaat-night';
                                   } else {
                                       // Only add priority class for day events
                                       iconClass += ` miqaat-p${indicatorInfo.priority}`;
                                   }
                                   // Add data attribute for the click handler
                                   indicatorHtml = `<span class="${iconClass}" data-hijri-date="${hYear}-${hMonth}-${hDay}" title="View Miqaats"></span>`;
                               }
                               // --- END NEW ICON GENERATION ---

                html += `<td class="${classes.join(' ')}" data-gregorian-date="${gregorianDataAttr}">
                           <div class="day-content">
                               ${indicatorHtml}
                               <span class="hijri-date">${hijriDateStr}</span>
                               <span class="gregorian-date">${gregorianDateStr}</span>
                           </div>
                         </td>`;

                gridDate.setDate(gridDate.getDate() + 1);
            }
            html += '</tr>';

            const nextWeekStartDateCheck = new Date(gridDate);
            const nextWeekStartHijri = HijriDate.fromGregorian(nextWeekStartDateCheck);
            if (nextWeekStartHijri.getYear() > hijriYear || (nextWeekStartHijri.getYear() === hijriYear && nextWeekStartHijri.getMonth() > hijriMonth)) {
                 break;
            }
        }
        calendarBody.innerHTML = html;
    }

    // --- Popup Functions ---
    function showMiqaatPopup(gregorianDateStr, hijriDateStr, miqaats) {
        if (!miqaats || miqaats.length === 0) return;

        popupDateElement.textContent = `Miqaats for: ${hijriDateStr} (${gregorianDateStr})`;

        let contentHtml = '<ul>';
        miqaats.forEach(m => {
            contentHtml += `<li>
                                <strong>${m.title}</strong>
                                ${m.description ? `<span>${m.description}</span>` : ''}
                           </li>`;
        });
        contentHtml += '</ul>';
        popupContentElement.innerHTML = contentHtml;

        miqaatPopup.classList.add('visible');
        popupBackdrop.classList.add('visible');
    }

    function hideMiqaatPopup() {
        miqaatPopup.classList.remove('visible');
        popupBackdrop.classList.remove('visible');
        // Clear content after fade out might be smoother, but this is simpler
        popupContentElement.innerHTML = '';
        popupDateElement.textContent = '';
    }

    // --- Event Listeners ---
    prevMonthButton.addEventListener('click', () => {
        let newMonth = currentHijriMonth - 1;
        let newYear = currentHijriYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        renderCalendar(newYear, newMonth);
    });
    nextMonthButton.addEventListener('click', () => {
        let newMonth = currentHijriMonth + 1;
        let newYear = currentHijriYear;
        if (newMonth > 11) { newMonth = 0; newYear++; }
        renderCalendar(newYear, newMonth);
    });
    prevYearButton.addEventListener('click', () => renderCalendar(currentHijriYear - 1, currentHijriMonth));
    nextYearButton.addEventListener('click', () => renderCalendar(currentHijriYear + 1, currentHijriMonth));
    todayButton.addEventListener('click', () => {
        const todayHijri = HijriDate.fromGregorian(new Date());
        renderCalendar(todayHijri.getYear(), todayHijri.getMonth());
    });

    // Popup close listeners
    popupCloseButton.addEventListener('click', hideMiqaatPopup);
    popupBackdrop.addEventListener('click', hideMiqaatPopup);

    // Calendar body click listener (Event Delegation)
    calendarBody.addEventListener('click', (event) => {
        const target = event.target;
        let dayCell = null;

        

         // Check if an icon OR the day-content area within a cell that HAS an icon was clicked
         if (target.classList.contains('indicator-icon')) {
            dayCell = target.closest('.calendar-day');
         } else if (target.classList.contains('day-content') && target.querySelector('.indicator-icon')) {
             dayCell = target.closest('.calendar-day');
         } else if (target.closest('.day-content') && target.closest('.day-content').querySelector('.indicator-icon')) {
             dayCell = target.closest('.calendar-day');
         }

        if (dayCell) {
            const gregorianDateStr = dayCell.dataset.gregorianDate;
            if (!gregorianDateStr) return;

            const gDateParts = gregorianDateStr.split('-');
            const gDate = new Date(parseInt(gDateParts[0]), parseInt(gDateParts[1]) - 1, parseInt(gDateParts[2]));
            gDate.setHours(12,0,0,0); // Avoid timezone issues
            const hijriDate = HijriDate.fromGregorian(gDate);
            const hYear = hijriDate.getYear();
            const hMonth = hijriDate.getMonth();
            const hDay = hijriDate.getDate();

           

                             
// --- NEW CORRECTED POPUP FILTER BLOCK ---
            // Find all *applicable* miqaats for this specific day for the POPUP using "Year X onwards" logic
                       // --- RE-CORRECTED POPUP FILTER BLOCK ---
            // Find all applicable miqaats for this specific day for the POPUP
            // This filter MUST match the conditions used for showing ANY icon (including night & year>=)
                        // --- RE-CORRECTED POPUP FILTER BLOCK ---
            // Find all applicable miqaats for this specific day for the POPUP
            // This filter MUST match the conditions used for showing ANY icon (including night & year>=)
            const dayMiqaats = [];
            miqaatsData.filter(entry => entry.month === hMonth && entry.date === hDay)
                       .forEach(entry => {
                           if (entry.miqaats && Array.isArray(entry.miqaats)) {
                               entry.miqaats.forEach(miqaat => {
                                   // Check year applicability ("Year X onwards" logic)
                                   const isYearApplicablePopup = (miqaat.year === null || (miqaat.year !== null && hYear >= miqaat.year));

                                   // If the year is applicable, add it to the list for the popup
                                   // (We no longer filter by phase here, matching the icon display)
                                   if (isYearApplicablePopup) {
                                       dayMiqaats.push(miqaat);
                                   }
                               });
                           }
                       });
             // --- END RE-CORRECTED POPUP FILTER BLOCK ---

             // Add console log right after filtering to check the result:
             console.log(`[Popup Filter] Date: ${hDay}/${hMonth}/${hYear}, Found Miqaats for Popup:`, JSON.stringify(dayMiqaats));

             // Sort miqaats by priority (good for display order)
             dayMiqaats.sort((a, b) => a.priority - b.priority);

             // Call showMiqaatPopup if any were found
             if (dayMiqaats.length > 0) {
                 console.log("[Popup Filter] Conditions met, attempting to show popup."); // Add log
                 const hijriDateDisplay = `${hDay} ${HijriDate.getShortMonthName(hMonth)}, ${hYear}H`;
                 const gregDateDisplay = `${gDate.getDate()} ${GREGORIAN_MONTHS_SHORT[gDate.getMonth()]} ${gDate.getFullYear()}`;
                 showMiqaatPopup(gregDateDisplay, hijriDateDisplay, dayMiqaats);
             } else {
                  console.log("[Popup Filter] No applicable miqaats found for popup display."); // Add log
                 hideMiqaatPopup(); // Ensure it's hidden if nothing to show
             }
        }
    });

    // --- Initial Load ---
    async function initializeCalendar() {
        try {
            await loadMiqaats(); // Wait for data to load

            // If loadMiqaats didn't throw an error but data is still empty (e.g., empty JSON file)
             if (miqaatsData.length === 0) {
                 console.error("Initialization stopped: Miqaats data is empty.");
                 if (!calendarBody.innerHTML.includes('Error loading')) { // Avoid duplicate messages
                    calendarBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: orange; padding: 20px;">Miqaats data loaded but is empty. Calendar may not show events.</td></tr>';
                 }
                 // Continue rendering basic calendar structure anyway, or return here to completely stop
            }

            // Set initial date (Shawwal 1446H from image)
            const initialYear = 1446;
            const initialMonth = 9;
            renderCalendar(initialYear, initialMonth);

        } catch (error) {
             console.error("Failed to initialize calendar due to data loading error:", error);
             // Error message should already be in the calendar body from loadMiqaats
             // Optionally disable controls here
              [prevMonthButton, nextMonthButton, prevYearButton, nextYearButton, todayButton].forEach(btn => btn.disabled = true);
        }
    }

    initializeCalendar(); // Start the async initialization process

});