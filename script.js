const CSV_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQHyhDdtefbT2TLzH5XxOv-BuhCou8HrzMtygu2bn6YKyYmXKJirAICAj_GOqeroc4wszw-q4AA_4_m/pub?gid=1227661950&single=true&output=csv";

let countries = [];

let currentPage = 1;

const ITEMS_PER_PAGE = 20;


/* =========================
   LOAD CSV
========================= */

async function loadStatistics() {

    try {

        const response = await fetch(
            CSV_URL + "&t=" + Date.now(),
            {
                cache: "no-store"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to load statistics.");
        }

        const csvText = await response.text();

        console.log("RAW CSV:");
        console.log(csvText);

        parseCSV(csvText);

    } catch (error) {

        console.error(error);

        document.getElementById("total").textContent =
            "Unable to load";

        document.getElementById("countryTable").innerHTML = `
            <tr>
                <td colspan="2">
                    Unable to load statistics.
                </td>
            </tr>
        `;
    }
}


/* =========================
   CLEAN CSV CELL
========================= */

function cleanCell(value) {

    return value
        .replace(/^"|"$/g, "")
        .trim();

}


/* =========================
   PARSE CSV
========================= */

function parseCSV(csvText) {

    const lines = csvText
        .trim()
        .split(/\r?\n/);

    countries = [];

    let countrySectionStarted = false;

    let totalFound = false;


    for (let i = 0; i < lines.length; i++) {

        const line = lines[i].trim();

        if (!line) {
            continue;
        }


        const parts = line.split(",");

        const firstCell =
            cleanCell(parts[0] || "");

        const secondCell =
            cleanCell(parts[1] || "");


        /* =========================
           TOTAL SOMSOMS
        ========================= */

        if (
            firstCell.toLowerCase() ===
            "total somsoms"
        ) {

            /*
             * Google Sheets may publish:
             *
             * Total Somsoms
             * 1
             *
             * instead of:
             *
             * Total Somsoms,1
             */

            let totalValue = Number(secondCell);


            if (
                !secondCell ||
                isNaN(totalValue)
            ) {

                for (
                    let j = i + 1;
                    j < lines.length;
                    j++
                ) {

                    const nextLine =
                        lines[j].trim();

                    if (!nextLine) {
                        continue;
                    }

                    const nextParts =
                        nextLine.split(",");

                    const possibleTotal =
                        cleanCell(
                            nextParts[0] || ""
                        );

                    if (
                        possibleTotal !== "" &&
                        !isNaN(
                            Number(possibleTotal)
                        )
                    ) {

                        totalValue =
                            Number(possibleTotal);

                        break;
                    }

                    break;
                }
            }


            if (!isNaN(totalValue)) {

                document.getElementById(
                    "total"
                ).textContent =
                    totalValue.toLocaleString();

                totalFound = true;
            }


            continue;
        }


        /* =========================
           COUNTRY HEADER
        ========================= */

        if (
            firstCell.toLowerCase() === "country" &&
            secondCell.toLowerCase() === "participants"
        ) {

            countrySectionStarted = true;

            continue;
        }


        /* =========================
           IGNORE EVERYTHING
           BEFORE COUNTRY HEADER
        ========================= */

        if (!countrySectionStarted) {
            continue;
        }


        /* =========================
           COUNTRY ROW
        ========================= */

        /*
         * A valid country row MUST:
         *
         * 1. Have exactly 2 columns
         * 2. Have country name
         * 3. Have numeric participant count
         */

        if (parts.length !== 2) {
            continue;
        }


        const country =
            firstCell;

        const participants =
            Number(secondCell);


        if (!country) {
            continue;
        }


        if (isNaN(participants)) {
            continue;
        }


        /*
         * Extra protection:
         * Never allow summary labels
         * to enter the country list.
         */

        if (
            country.toLowerCase() ===
            "total somsoms"
        ) {
            continue;
        }


        if (
            country.toLowerCase() ===
            "country"
        ) {
            continue;
        }


        countries.push({
            country: country,
            participants: participants
        });

    }


    /* =========================
       TOTAL FALLBACK
    ========================= */

    if (!totalFound) {

        document.getElementById(
            "total"
        ).textContent = "0";

    }


    displayCountries();

}


/* =========================
   DISPLAY COUNTRIES
========================= */

function displayCountries() {

    const sortType =
        document.getElementById(
            "sortSelect"
        ).value;


    const searchInput =
        document.getElementById(
            "searchInput"
        );


    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();


    /* =========================
       FILTER
    ========================= */

    let filteredCountries =
        countries.filter(item =>
            item.country
                .toLowerCase()
                .includes(searchTerm)
        );


    /* =========================
       SORT
    ========================= */

    if (sortType === "count") {

        filteredCountries.sort(
            (a, b) =>
                b.participants -
                a.participants
        );

    } else {

        filteredCountries.sort(
            (a, b) =>
                a.country.localeCompare(
                    b.country
                )
        );

    }


    /* =========================
       COUNTRY COUNT
    ========================= */

    const countryCount =
        document.getElementById(
            "countryCount"
        );


    countryCount.textContent =
        `Somsoms have checked in from ${countries.length} countries/locations on the Somsoms Map.`;


    /* =========================
       PAGINATION
    ========================= */

    const totalPages =
        Math.ceil(
            filteredCountries.length /
            ITEMS_PER_PAGE
        );


    /*
     * Make sure current page
     * is always valid.
     */

    if (
        currentPage > totalPages &&
        totalPages > 0
    ) {

        currentPage = totalPages;

    }


    if (totalPages === 0) {

        currentPage = 1;

    }


    const startIndex =
        (currentPage - 1) *
        ITEMS_PER_PAGE;


    const endIndex =
        startIndex +
        ITEMS_PER_PAGE;


    const pageCountries =
        filteredCountries.slice(
            startIndex,
            endIndex
        );


    /* =========================
       TABLE
    ========================= */

    const table =
        document.getElementById(
            "countryTable"
        );


    table.innerHTML = "";


    /* =========================
       NO SEARCH RESULTS
    ========================= */

    if (
        filteredCountries.length === 0
    ) {

        table.innerHTML = `
            <tr>
                <td colspan="2">
                    No registered Somsoms found for this country/location.
                </td>
            </tr>
        `;

        renderPagination(0);

        return;
    }


    /* =========================
       CREATE ROWS
    ========================= */

    pageCountries.forEach(
        item => {

            const row =
                document.createElement("tr");


            const countryCell =
                document.createElement("td");


            const participantCell =
                document.createElement("td");


            countryCell.textContent =
                item.country;


            participantCell.textContent =
                item.participants.toLocaleString();


            row.appendChild(
                countryCell
            );


            row.appendChild(
                participantCell
            );


            table.appendChild(row);

        }
    );


    /* =========================
       PAGINATION
    ========================= */

    renderPagination(totalPages);

}

function renderPagination(totalPages) {

    let pagination =
        document.getElementById(
            "pagination"
        );


    /*
     * Create pagination container
     * if it does not exist yet.
     */

    if (!pagination) {

        pagination =
            document.createElement("div");

        pagination.id =
            "pagination";

        pagination.className =
            "pagination";


        const countriesBox =
            document.querySelector(
                ".countries-box"
            );


        countriesBox.appendChild(
            pagination
        );

    }


    pagination.innerHTML = "";


    if (totalPages <= 1) {
        return;
    }


    /* =========================
       PREVIOUS
    ========================= */

    const previousButton =
        document.createElement("button");

    previousButton.textContent = "‹";

    previousButton.disabled =
        currentPage === 1;


    previousButton.addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                displayCountries();

            }

        }
    );


    pagination.appendChild(
        previousButton
    );


    /* =========================
       PAGE NUMBERS
    ========================= */

    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        const pageButton =
            document.createElement("button");


        pageButton.textContent =
            page;


        if (
            page === currentPage
        ) {

            pageButton.classList.add(
                "active"
            );

        }


        pageButton.addEventListener(
            "click",
            () => {

                currentPage = page;

                displayCountries();

            }
        );


        pagination.appendChild(
            pageButton
        );

    }


    /* =========================
       NEXT
    ========================= */

    const nextButton =
        document.createElement("button");

    nextButton.textContent = "›";

    nextButton.disabled =
        currentPage === totalPages;


    nextButton.addEventListener(
        "click",
        () => {

            if (
                currentPage <
                totalPages
            ) {

                currentPage++;

                displayCountries();

            }

        }
    );


    pagination.appendChild(
        nextButton
    );

}


/* =========================
   SORT
========================= */

document
    .getElementById("sortSelect")
    .addEventListener(
        "change",
        () => {

            currentPage = 1;

            displayCountries();

        }
    );


document
    .getElementById("searchInput")
    .addEventListener(
        "input",
        () => {

            currentPage = 1;

            displayCountries();

        }
    );


/* =========================
   START
========================= */

loadStatistics();
