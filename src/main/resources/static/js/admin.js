(() => {
    const table = document.getElementById("adminTable");
    const filterInput = document.getElementById("adminFilterInput");
    const sortFieldSelect = document.getElementById("adminSortField");
    const sortDirectionSelect = document.getElementById("adminSortDirection");
    const noMatchesMessage = document.getElementById("adminNoMatches");

    if (!table || !filterInput || !sortFieldSelect || !sortDirectionSelect || !noMatchesMessage) {
        return;
    }

    const tbody = table.querySelector("tbody");
    const rows = Array.from(tbody.querySelectorAll("tr"));

    const getValue = (row, field) => {
        if (field === "errorId") {
            return Number(row.dataset.errorId || 0);
        }

        if (field === "httpError") {
            return Number(row.dataset.httpError || 0);
        }

        return row.dataset.occurredAt || "";
    };

    const matchesFilter = (row, filterValue) => {
        if (!filterValue) {
            return true;
        }

        const combinedText = [
            row.dataset.errorId,
            row.dataset.httpError,
            row.dataset.occurredAt,
            row.textContent
        ]
            .join(" ")
            .toLowerCase();

        return combinedText.includes(filterValue);
    };

    const render = () => {
        const filterValue = filterInput.value.trim().toLowerCase();
        const sortField = sortFieldSelect.value;
        const sortDirection = sortDirectionSelect.value;

        const visibleRows = rows
            .filter((row) => matchesFilter(row, filterValue))
            .sort((left, right) => {
                const leftValue = getValue(left, sortField);
                const rightValue = getValue(right, sortField);

                if (leftValue < rightValue) {
                    return sortDirection === "asc" ? -1 : 1;
                }

                if (leftValue > rightValue) {
                    return sortDirection === "asc" ? 1 : -1;
                }

                return 0;
            });

        rows.forEach((row) => {
            row.classList.add("hidden");
        });

        visibleRows.forEach((row) => {
            row.classList.remove("hidden");
            tbody.appendChild(row);
        });

        noMatchesMessage.classList.toggle("hidden", visibleRows.length > 0);
    };

    filterInput.addEventListener("input", render);
    sortFieldSelect.addEventListener("change", render);
    sortDirectionSelect.addEventListener("change", render);

    render();
})();
