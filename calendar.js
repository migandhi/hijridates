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
                throw new Error(`HTTP error! status: ${response.status} - Failed to load ${MIQAATS_JSON_PATH}`);
            }
            miqaatsData = await response.json();
            console.log("Miqaats data loaded successfully from", MIQAATS_JSON_PATH);
            if (!Array.isArray(miqaatsData)) {
                throw new Error("Miqaats data is not a valid JSON array.");
            }
             if (miqaatsData.length === 0) {
                 console.warn("Miqaats data file is empty.");
                 // We can continue, but events won't show.
             }
        } catch (error) {
            console.error("Error loading or parsing miqaats data:", error);
            miqaatsData = []; // Ensure it's an empty array on error
            calendarBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: red; padding: 20px;">Error loading miqaats data: ${error.message}. Calendar functionality may be limited. Please check file path and JSON validity.</td></tr>`;
            // Rethrow the error to stop initialization if data is critical
            throw error;
        }
    }

    // Function to get info for the highest priority miqaat icon
    // Returns { priority: P, phase: 'day'|'night' } or null
    function getMiqaatIndicatorInfo(hYear, hMonth, hDay) {
        let highestPriority = 4;
        let phaseOfHighest = null;

        const relevantEntries = miqaatsData.filter(entry =>
            entry.month === hMonth && entry.date === hDay
        );

        relevantEntries.forEach(entry => {
            if (entry.miqaats && Array.isArray(entry.miqaats)) {
                entry.miqaats.forEach(miqaat => {
                    // Check year applicability ("Year X onwards" logic)
                    const isYearApplicable = (miqaat.year === null || (miqaat.year !== null && hYear >= miqaat.year));

                    if (isYearApplicable) {
                         const currentMiqaatPriority = parseInt(miqaat.priority);
                         if (!isNaN(currentMiqaatPriority) && currentMiqaatPriority >= 1 && currentMiqaatPriority < highestPriority) {
                            highestPriority = currentMiqaatPriority;
                            phaseOfHighest = miqaat.phase; // Store the phase of this new highest priority event
                        }
                    }
                });
            }
        });

        if (highestPriority <= 3) {
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
        // Basic check if data is available (should be guaranteed by async init unless error)
        if (!Array.isArray(miqaatsData)) {
             console.error("Attempted to render calendar without miqaats data array.");
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

        const todayGregorian = new Date(); // Actual current date
        todayGregorian.setHours(0, 0, 0, 0); // Normalize for comparison

        let html = '';
        const gridDate = new Date(startDate); // Date object to iterate through the grid

        for (let i = 0; i < 6; i++) {
            html += '<tr>';
            for (let j = 0; j < 7; j++) {
                const cellGregorianDateNorm = new Date(gridDate); // Use normalized date for comparisons/conversions
                cellGregorianDateNorm.setHours(0, 0, 0, 0);

                const cellGregorianDateDisplay = new Date(gridDate); // Keep original for display formatting if needed

                const cellHijriDate = HijriDate.fromGregorian(cellGregorianDateNorm);
                const hDay = cellHijriDate.getDate();
                const hMonth = cellHijriDate.getMonth();
                const hYear = cellHijriDate.getYear();

                const isCurrentMonth = (hMonth === hijriMonth && hYear === hijriYear);
                const isToday = cellGregorianDateNorm.getTime() === todayGregorian.getTime();
                const isFirstInGrid = (i === 0 && j === 0);

                const classes = ['calendar-day'];
                if (!isCurrentMonth) classes.push('other-month');
                if (isToday) classes.push('today'); // Highlight actual current date

                const gregorianDateStr = formatGregorianDate(cellGregorianDateDisplay, isFirstInGrid, startDate);
                const hijriDateStr = toArabicNumerals(hDay);
                const gregorianDataAttr = `${cellGregorianDateNorm.getFullYear()}-${String(cellGregorianDateNorm.getMonth() + 1).padStart(2, '0')}-${String(cellGregorianDateNorm.getDate()).padStart(2, '0')}`;


                // --- Render Icon ---
                const indicatorInfo = getMiqaatIndicatorInfo(hYear, hMonth, hDay);
                let indicatorHtml = '';
                if (indicatorInfo) {
                    let iconClass = 'indicator-icon';
                    if (indicatorInfo.phase === 'night') {
                        iconClass += ' miqaat-night';
                    } else {
                        iconClass += ` miqaat-p${indicatorInfo.priority}`;
                    }
                    indicatorHtml = `<span class="${iconClass}" data-hijri-date="${hYear}-${hMonth}-${hDay}" title="View Miqaats"></span>`;
                }
                // --- End Render Icon ---


                html += `<td class="${classes.join(' ')}" data-gregorian-date="${gregorianDataAttr}">
                           <div class="day-content">
                               ${indicatorHtml}
                               <span class="hijri-date">${hijriDateStr}</span>
                               <span class="gregorian-date">${gregorianDateStr}</span>
                           </div>
                         </td>`;

                // Move to the next day and normalize
                gridDate.setDate(gridDate.getDate() + 1);
                gridDate.setHours(0, 0, 0, 0);
            }
            html += '</tr>';

            // Optimization Check: Stop if next row starts in a future Hijri month
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
        popupContentElement.innerHTML = ''; // Clear content
        popupDateElement.textContent = '';
    }

    // --- Event Listeners ---
    prevMonthButton.addEventListener('click', () => {
        let targetMonth = currentHijriMonth - 1;
        let targetYear = currentHijriYear;
        if (targetMonth < 0) { targetMonth = 11; targetYear--; }
        const firstOfTargetHijri = new HijriDate(targetYear, targetMonth, 1);
        const firstGregorian = firstOfTargetHijri.toGregorian();
        const actualHijriToDisplay = HijriDate.fromGregorian(firstGregorian);
        renderCalendar(actualHijriToDisplay.getYear(), actualHijriToDisplay.getMonth());
    });

    nextMonthButton.addEventListener('click', () => {
        let targetMonth = currentHijriMonth + 1;
        let targetYear = currentHijriYear;
        if (targetMonth > 11) { targetMonth = 0; targetYear++; }
        const firstOfTargetHijri = new HijriDate(targetYear, targetMonth, 1);
        const firstGregorian = firstOfTargetHijri.toGregorian();
        const actualHijriToDisplay = HijriDate.fromGregorian(firstGregorian);
        renderCalendar(actualHijriToDisplay.getYear(), actualHijriToDisplay.getMonth());
    });

    prevYearButton.addEventListener('click', () => {
        const targetYear = currentHijriYear - 1;
        const targetMonth = currentHijriMonth;
        const firstOfTargetHijri = new HijriDate(targetYear, targetMonth, 1);
        const firstGregorian = firstOfTargetHijri.toGregorian();
        const actualHijriToDisplay = HijriDate.fromGregorian(firstGregorian);
        renderCalendar(actualHijriToDisplay.getYear(), actualHijriToDisplay.getMonth());
    });

    nextYearButton.addEventListener('click', () => {
        const targetYear = currentHijriYear + 1;
        const targetMonth = currentHijriMonth;
        const firstOfTargetHijri = new HijriDate(targetYear, targetMonth, 1);
        const firstGregorian = firstOfTargetHijri.toGregorian();
        const actualHijriToDisplay = HijriDate.fromGregorian(firstGregorian);
        renderCalendar(actualHijriToDisplay.getYear(), actualHijriToDisplay.getMonth());
    });

    todayButton.addEventListener('click', () => {
        const todayGregorian = new Date(); // Get current date/time
        const todayHijri = HijriDate.fromGregorian(todayGregorian);
        renderCalendar(todayHijri.getYear(), todayHijri.getMonth());
    });

    // Popup close listeners
    popupCloseButton.addEventListener('click', hideMiqaatPopup);
    popupBackdrop.addEventListener('click', hideMiqaatPopup);

    // Calendar body click listener (Event Delegation for Popup)
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
            gDate.setHours(12,0,0,0); // Use midday for Hijri conversion to avoid timezone edge cases
            const hijriDate = HijriDate.fromGregorian(gDate);
            const hYear = hijriDate.getYear();
            const hMonth = hijriDate.getMonth();
            const hDay = hijriDate.getDate();

            // Find all *applicable* miqaats for this specific day for the POPUP using "Year X onwards" logic
            const dayMiqaats = [];
            miqaatsData.filter(entry => entry.month === hMonth && entry.date === hDay)
                       .forEach(entry => {
                           if (entry.miqaats && Array.isArray(entry.miqaats)) {
                               entry.miqaats.forEach(miqaat => {
                                   const isYearApplicablePopup = (miqaat.year === null || (miqaat.year !== null && hYear >= miqaat.year));
                                   if (isYearApplicablePopup) {
                                       dayMiqaats.push(miqaat);
                                   }
                               });
                           }
                       });

            // console.log(`[Popup Filter] Date: ${hDay}/${hMonth}/${hYear}, Found Miqaats for Popup:`, JSON.stringify(dayMiqaats)); // Optional debug

            // Sort miqaats by priority (good for display order)
            dayMiqaats.sort((a, b) => a.priority - b.priority);

            // Call showMiqaatPopup if any were found
            if (dayMiqaats.length > 0) {
                 // console.log("[Popup Filter] Conditions met, attempting to show popup."); // Optional debug
                 const hijriDateDisplay = `${hDay} ${HijriDate.getShortMonthName(hMonth)}, ${hYear}H`;
                 // Format Gregorian date for display using original parts (or re-read from cell if needed)
                 const gDayDisplay = gDateParts[2].startsWith('0') ? gDateParts[2].substring(1) : gDateParts[2]; // Remove leading zero for day
                 const gMonthDisplay = GREGORIAN_MONTHS_SHORT[parseInt(gDateParts[1]) - 1];
                 const gYearDisplay = gDateParts[0];
                 const gregDateDisplay = `${gDayDisplay} ${gMonthDisplay} ${gYearDisplay}`;

                 showMiqaatPopup(gregDateDisplay, hijriDateDisplay, dayMiqaats);
            } else {
                 // console.log("[Popup Filter] No applicable miqaats found for popup display."); // Optional debug
                 hideMiqaatPopup(); // Ensure it's hidden if nothing to show
            }
        }
    });

    // --- Initial Load ---
    async function initializeCalendar() {
        try {
            await loadMiqaats(); // Wait for data to load

            // Determine initial date (Use Today's date to start)
            const todayGregorian = new Date();
            const initialHijri = HijriDate.fromGregorian(todayGregorian);
            renderCalendar(initialHijri.getYear(), initialHijri.getMonth());

            // Optionally, start on a specific date like the screenshot if needed for testing:
            // const initialYear = 1446;
            // const initialMonth = 9; // Shawwal
            // renderCalendar(initialYear, initialMonth);

        } catch (error) {
             console.error("Failed to initialize calendar:", error);
             // Error message should already be in the calendar body from loadMiqaats
             // Optionally disable controls here
              [prevMonthButton, nextMonthButton, prevYearButton, nextYearButton, todayButton].forEach(btn => btn.disabled = true);
        }
    }

    initializeCalendar(); // Start the async initialization process

});