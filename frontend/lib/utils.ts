// CSV export utility
export function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
    const BOM = "\uFEFF"; // UTF-8 BOM for Arabic support in Excel
    const headerRow = headers.join(",");
    const dataRows = rows.map(r =>
        r.map(cell => {
            const str = cell == null ? "" : String(cell);
            // Escape quotes and wrap in quotes if needed
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        }).join(",")
    );
    const csv = BOM + [headerRow, ...dataRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Dark mode
export function toggleDarkMode() {
    const html = document.documentElement;
    html.classList.toggle("dark");
    localStorage.setItem("darkMode", html.classList.contains("dark") ? "1" : "0");
}

export function initDarkMode() {
    if (localStorage.getItem("darkMode") === "1") {
        document.documentElement.classList.add("dark");
    }
}
