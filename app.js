/* =========================================================
   FINANTRACK v0.5.0
   Control de deudas, metas y Mi Dinero
   ========================================================= */

const STORAGE_KEY = "finantrack_data_v05";

let data = {
    debts: [],
    goals: [],
    moneyPeriods: []
};

let currentMoneyPeriodId = null;
let toastTimer = null;


/* =========================================================
   UTILIDADES
   ========================================================= */

function uid(prefix = "id") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 8)
    );
}

function money(value) {
    const number = Number(value) || 0;

    return number.toLocaleString("en-US", {
        style: "currency",
        currency: "USD"
    });
}

function number(value) {
    return Number(value) || 0;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function round2(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function todayISO() {
    const date = new Date();

    const offset =
        date.getTimezoneOffset() * 60000;

    return new Date(
        date.getTime() - offset
    ).toISOString().slice(0, 10);
}

function formatDate(dateString) {

    if (!dateString) {
        return "Sin fecha";
    }

    const date = new Date(
        dateString + "T00:00:00"
    );

    if (Number.isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("es-SV", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function addDays(dateString, days) {

    const date = new Date(
        dateString + "T00:00:00"
    );

    date.setDate(
        date.getDate() + days
    );

    return date.toISOString().slice(0, 10);
}

function addMonths(dateString, months) {

    const date = new Date(
        dateString + "T00:00:00"
    );

    const originalDay = date.getDate();

    date.setMonth(
        date.getMonth() + months
    );

    /*
      Evita problemas cuando la fecha cae en
      meses con menos días.
    */
    if (date.getDate() !== originalDay) {
        date.setDate(0);
    }

    return date.toISOString().slice(0, 10);
}

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2600);
}


/* =========================================================
   STORAGE
   ========================================================= */

function saveData() {

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}

function loadData() {

    const current =
        localStorage.getItem(STORAGE_KEY);

    if (current) {

        try {

            data = normalizeData(
                JSON.parse(current)
            );

            return;

        } catch (error) {

            console.error(
                "Error leyendo datos actuales:",
                error
            );
        }
    }

    /*
      Intentar migrar versiones anteriores.
    */

    const oldV04 =
        localStorage.getItem(
            "finantrack_data_v04"
        );

    const oldV03 =
        localStorage.getItem(
            "finantrack_data_v03"
        );

    if (oldV04) {

        try {

            const old =
                JSON.parse(oldV04);

            data = normalizeData(old);

            saveData();

            showToast(
                "Datos de FinanTrack v0.4 migrados."
            );

            return;

        } catch (error) {
            console.error(error);
        }
    }

    if (oldV03) {

        try {

            const old =
                JSON.parse(oldV03);

            data = normalizeData(old);

            saveData();

            showToast(
                "Datos de FinanTrack v0.3 migrados."
            );

            return;

        } catch (error) {
            console.error(error);
        }
    }

    data = {
        debts: [],
        goals: [],
        moneyPeriods: []
    };
}

function normalizeData(input) {

    const result = {
        debts: Array.isArray(input?.debts)
            ? input.debts
            : [],

        goals: Array.isArray(input?.goals)
            ? input.goals
            : [],

        moneyPeriods:
            Array.isArray(input?.moneyPeriods)
                ? input.moneyPeriods
                : []
    };


    result.debts =
        result.debts.map(debt => {

            const normalized = {
                ...debt,

                id:
                    debt.id ||
                    uid("debt"),

                schedule:
                    Array.isArray(debt.schedule)
                        ? debt.schedule
                        : [],

                payments:
                    Array.isArray(debt.payments)
                        ? debt.payments
                        : [],

                extraPrincipalPayments:
                    Array.isArray(
                        debt.extraPrincipalPayments
                    )
                        ? debt.extraPrincipalPayments
                        : []
            };

            normalized.schedule =
                normalized.schedule.map(
                    (inst, index) => ({
                        id:
                            inst.id ||
                            uid("inst"),

                        number:
                            inst.number ||
                            index + 1,

                        dueDate:
                            inst.dueDate ||
                            todayISO(),

                        amount:
                            number(inst.amount),

                        principal:
                            number(inst.principal),

                        interest:
                            number(inst.interest),

                        paidAmount:
                            number(inst.paidAmount),

                        paidPrincipal:
                            number(
                                inst.paidPrincipal
                            ),

                        paidInterest:
                            number(
                                inst.paidInterest
                            ),

                        paidDate:
                            inst.paidDate || "",

                        status:
                            inst.status ||
                            "pending"
                    })
                );

            normalized.payments =
                normalized.payments.map(
                    payment => ({
                        ...payment,

                        id:
                            payment.id ||
                            uid("payment"),

                        amount:
                            number(payment.amount),

                        principal:
                            number(payment.principal),

                        interest:
                            number(payment.interest),

                        extraPrincipal:
                            number(
                                payment.extraPrincipal
                            )
                    })
                );

            normalized.extraPrincipalPayments =
                normalized.extraPrincipalPayments.map(
                    item => ({
                        ...item,

                        id:
                            item.id ||
                            uid("extra"),

                        amount:
                            number(item.amount)
                    })
                );

            return normalized;
        });


    result.goals =
        result.goals.map(goal => {

            const contributions =
                Array.isArray(goal.contributions)
                    ? goal.contributions.map(item => ({
                        ...item,

                        id:
                            item.id ||
                            uid("contrib"),

                        type:
                            item.type === "withdraw"
                                ? "withdraw"
                                : "add",

                        amount:
                            number(item.amount),

                        date:
                            item.date || todayISO(),

                        note:
                            item.note || ""
                    }))
                    : [];

            return {
                ...goal,

                id:
                    goal.id ||
                    uid("goal"),

                name:
                    goal.name ||
                    goal.title ||
                    "Meta",

                target:
                    number(
                        goal.target ??
                        goal.total ??
                        0
                    ),

                saved:
                    number(
                        goal.saved ??
                        goal.paid ??
                        0
                    ),

                startDate:
                    goal.startDate || "",

                months:
                    number(goal.months),

                frequency:
                    [
                        "weekly",
                        "biweekly",
                        "monthly"
                    ].includes(goal.frequency)
                        ? goal.frequency
                        : "monthly",

                initialSaved:
                    number(goal.initialSaved),

                note:
                    goal.note || "",

                contributions
            };
        });


    result.moneyPeriods =
        result.moneyPeriods.map(
            period => {

                const normalized = {
                    id:
                        period.id ||
                        uid("period"),

                    name:
                        period.name ||
                        "Período",

                    start:
                        period.start ||
                        todayISO(),

                    end:
                        period.end ||
                        todayISO(),

                    initialAmount:
                        number(
                            period.initialAmount
                        ),

                    items:
                        Array.isArray(period.items)
                            ? period.items
                            : []
                };

                normalized.items =
                    normalized.items.map(
                        item => ({
                            id:
                                item.id ||
                                uid("item"),

                            name:
                                item.name ||
                                "Item",

                            amount:
                                number(item.amount),

                            date:
                                item.date ||
                                normalized.start,

                            note:
                                item.note ||
                                "",

                            completed:
                                Boolean(
                                    item.completed
                                )
                        })
                    );

                return normalized;
            }
        );

    return result;
}


/* =========================================================
   MODALES
   ========================================================= */

function openModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {
        modal.classList.add("open");
    }
}

function closeModal(id) {

    const modal =
        document.getElementById(id);

    if (modal) {
        modal.classList.remove("open");
    }
}

function closeAllModals() {

    document
        .querySelectorAll(".modal.open")
        .forEach(modal => {
            modal.classList.remove("open");
        });
}


/* =========================================================
   NAVEGACIÓN
   ========================================================= */

function showSection(section) {

    document
        .querySelectorAll(".app-section")
        .forEach(element => {
            element.classList.remove("active");
        });

    document
        .querySelectorAll(".tab-btn")
        .forEach(button => {
            button.classList.remove("active");
        });


    const target =
        document.getElementById(
            `section-${section}`
        );

    const button =
        document.querySelector(
            `.tab-btn[data-section="${section}"]`
        );

    if (target) {
        target.classList.add("active");
    }

    if (button) {
        button.classList.add("active");
    }

    if (section === "money") {
        renderMoney();
    }

    if (section === "debts") {
        renderDebts();
    }

    if (section === "goals") {
        renderGoals();
    }

    if (section === "dashboard") {
        renderDashboard();
    }
}


/* =========================================================
   MI DINERO
   ========================================================= */

function getCurrentMoneyPeriod() {

    if (!data.moneyPeriods.length) {
        return null;
    }

    let period =
        data.moneyPeriods.find(
            item =>
                item.id === currentMoneyPeriodId
        );

    if (!period) {

        /*
          Seleccionar el período más reciente.
        */

        const sorted =
            [...data.moneyPeriods].sort(
                (a, b) =>
                    b.start.localeCompare(a.start)
            );

        period = sorted[0];

        currentMoneyPeriodId =
            period.id;
    }

    return period;
}

function getMoneyStats(period) {

    if (!period) {

        return {
            initial: 0,
            spent: 0,
            pending: 0,
            available: 0
        };
    }

    const spent =
        period.items
            .filter(item => item.completed)
            .reduce(
                (sum, item) =>
                    sum + number(item.amount),
                0
            );

    const pending =
        period.items
            .filter(item => !item.completed)
            .reduce(
                (sum, item) =>
                    sum + number(item.amount),
                0
            );

    const available =
        number(period.initialAmount) -
        spent;

    return {
        initial:
            number(period.initialAmount),

        spent:
            round2(spent),

        pending:
            round2(pending),

        available:
            round2(available)
    };
}

function renderMoney() {

    renderPeriodSelector();

    const period =
        getCurrentMoneyPeriod();

    const summary =
        document.getElementById(
            "moneySummary"
        );

    const items =
        document.getElementById(
            "moneyItems"
        );


    if (!period) {

        summary.innerHTML = `
            <div class="empty-state">
                <div class="emoji">💰</div>

                <h3>No tienes períodos</h3>

                <p>
                    Crea tu primer período para
                    comenzar a administrar tu dinero.
                </p>

                <button
                    class="primary-btn"
                    style="margin-top:15px"
                    onclick="openNewPeriod()"
                >
                    + Crear período
                </button>
            </div>
        `;

        items.innerHTML = "";

        return;
    }


    const stats =
        getMoneyStats(period);

    const availableClass =
        stats.available < 0
            ? "money-negative"
            : "money-positive";


    summary.innerHTML = `

        <div class="money-summary">

            <div class="money-stat available">

                <span>Disponible</span>

                <strong class="${availableClass}">
                    ${money(stats.available)}
                </strong>

            </div>


            <div class="money-stat spent">

                <span>Marcado / gastado</span>

                <strong>
                    ${money(stats.spent)}
                </strong>

            </div>


            <div class="money-stat pending">

                <span>Pendiente</span>

                <strong>
                    ${money(stats.pending)}
                </strong>

            </div>

        </div>

        <div class="info-box" style="margin-top:12px">

            <strong>
                ${escapeHTML(period.name)}
            </strong>

            <p>
                ${formatDate(period.start)}
                →
                ${formatDate(period.end)}
                ·
                Dinero inicial:
                <strong>
                    ${money(stats.initial)}
                </strong>
            </p>

        </div>
    `;


    renderMoneyItems(period);
}

function renderPeriodSelector() {

    const selector =
        document.getElementById(
            "periodSelector"
        );

    if (!selector) {
        return;
    }

    const sorted =
        [...data.moneyPeriods].sort(
            (a, b) =>
                b.start.localeCompare(a.start)
        );

    if (!sorted.length) {

        selector.innerHTML =
            `<option value="">
                No hay períodos
            </option>`;

        return;
    }

    selector.innerHTML =
        sorted.map(period => `
            <option
                value="${period.id}"
                ${period.id === currentMoneyPeriodId
                    ? "selected"
                    : ""}
            >
                ${escapeHTML(period.name)}
                ·
                ${formatDate(period.start)}
                - ${formatDate(period.end)}
            </option>
        `).join("");
}

function renderMoneyItems(period) {

    const container =
        document.getElementById(
            "moneyItems"
        );

    if (!period.items.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="emoji">☑️</div>

                <h3>No hay items</h3>

                <p>
                    Agrega pagos, compras o gastos
                    que quieras controlar.
                </p>

            </div>
        `;

        return;
    }


    const sorted =
        [...period.items].sort(
            (a, b) => {

                /*
                  Pendientes primero.
                  Después se ordenan por fecha.
                */

                if (
                    a.completed !==
                    b.completed
                ) {
                    return a.completed
                        ? 1
                        : -1;
                }

                return a.date.localeCompare(
                    b.date
                );
            }
        );


    container.innerHTML =
        sorted.map(item => `

            <div
                class="money-item
                    ${item.completed
                        ? "completed"
                        : ""}"
            >

                <input
                    class="money-checkbox"
                    type="checkbox"
                    ${item.completed
                        ? "checked"
                        : ""}
                    onchange="
                        toggleMoneyItem(
                            '${item.id}'
                        )
                    "
                >


                <div class="money-item-main">

                    <div class="money-item-name">
                        ${escapeHTML(item.name)}
                    </div>

                    <div class="money-item-meta">

                        📅
                        ${formatDate(item.date)}

                        ${
                            item.note
                                ? ` · ${escapeHTML(item.note)}`
                                : ""
                        }

                    </div>

                </div>


                <div class="money-item-amount">
                    ${money(item.amount)}
                </div>


                <div class="money-item-actions">

                    <button
                        class="small-btn"
                        onclick="
                            editMoneyItem(
                                '${item.id}'
                            )
                        "
                        title="Editar"
                    >
                        ✏️
                    </button>

                    <button
                        class="small-btn"
                        onclick="
                            deleteMoneyItem(
                                '${item.id}'
                            )
                        "
                        title="Eliminar"
                    >
                        🗑️
                    </button>

                </div>

            </div>

        `).join("");
}

function openNewPeriod() {

    document.getElementById(
        "periodModalTitle"
    ).textContent =
        "Nuevo período";

    document.getElementById(
        "periodForm"
    ).reset();

    document.getElementById(
        "periodId"
    ).value = "";

    document.getElementById(
        "periodStart"
    ).value = todayISO();

    document.getElementById(
        "periodEnd"
    ).value =
        addDays(
            todayISO(),
            30
        );

    openModal("periodModal");
}

function editCurrentPeriod() {

    const period =
        getCurrentMoneyPeriod();

    if (!period) {
        showToast(
            "No hay ningún período seleccionado."
        );

        return;
    }

    document.getElementById(
        "periodModalTitle"
    ).textContent =
        "Editar período";

    document.getElementById(
        "periodId"
    ).value =
        period.id;

    document.getElementById(
        "periodName"
    ).value =
        period.name;

    document.getElementById(
        "periodStart"
    ).value =
        period.start;

    document.getElementById(
        "periodEnd"
    ).value =
        period.end;

    document.getElementById(
        "periodAmount"
    ).value =
        period.initialAmount;

    openModal("periodModal");
}

function savePeriod(event) {

    event.preventDefault();

    const id =
        document.getElementById(
            "periodId"
        ).value;

    const name =
        document.getElementById(
            "periodName"
        ).value.trim();

    const start =
        document.getElementById(
            "periodStart"
        ).value;

    const end =
        document.getElementById(
            "periodEnd"
        ).value;

    const amount =
        number(
            document.getElementById(
                "periodAmount"
            ).value
        );


    if (end < start) {

        showToast(
            "La fecha final no puede ser anterior a la inicial."
        );

        return;
    }


    if (id) {

        const period =
            data.moneyPeriods.find(
                item => item.id === id
            );

        if (period) {

            period.name = name;
            period.start = start;
            period.end = end;
            period.initialAmount = amount;
        }

        currentMoneyPeriodId = id;

    } else {

        const period = {

            id: uid("period"),

            name:
                name ||
                `Período ${formatDate(start)}`,

            start,
            end,

            initialAmount:
                round2(amount),

            items: []
        };

        data.moneyPeriods.push(period);

        currentMoneyPeriodId =
            period.id;
    }


    saveData();

    closeModal("periodModal");

    renderMoney();

    renderDashboard();

    showToast(
        "Período guardado correctamente."
    );
}

function deleteCurrentPeriod() {

    const period =
        getCurrentMoneyPeriod();

    if (!period) {
        return;
    }

    const confirmed =
        confirm(
            `¿Eliminar el período "${period.name}"?\n\n` +
            "También se eliminarán todos sus items."
        );

    if (!confirmed) {
        return;
    }

    data.moneyPeriods =
        data.moneyPeriods.filter(
            item => item.id !== period.id
        );

    currentMoneyPeriodId =
        data.moneyPeriods.length
            ? data.moneyPeriods[
                data.moneyPeriods.length - 1
            ].id
            : null;

    saveData();

    renderMoney();

    renderDashboard();

    showToast(
        "Período eliminado."
    );
}

function openNewMoneyItem() {

    const period =
        getCurrentMoneyPeriod();

    if (!period) {

        showToast(
            "Primero crea un período."
        );

        openNewPeriod();

        return;
    }

    document.getElementById(
        "moneyItemModalTitle"
    ).textContent =
        "Nuevo item";

    document.getElementById(
        "moneyItemForm"
    ).reset();

    document.getElementById(
        "moneyItemId"
    ).value = "";

    document.getElementById(
        "moneyItemDate"
    ).value =
        period.start;

    openModal("moneyItemModal");
}

function editMoneyItem(id) {

    const period =
        getCurrentMoneyPeriod();

    if (!period) {
        return;
    }

    const item =
        period.items.find(
            item => item.id === id
        );

    if (!item) {
        return;
    }

    document.getElementById(
        "moneyItemModalTitle"
    ).textContent =
        "Editar item";

    document.getElementById(
        "moneyItemId"
    ).value =
        item.id;

    document.getElementById(
        "moneyItemName"
    ).value =
        item.name;

    document.getElementById(
        "moneyItemAmount"
    ).value =
        item.amount;

    document.getElementById(
        "moneyItemDate"
    ).value =
        item.date;

    document.getElementById(
        "moneyItemNote"
    ).value =
        item.note || "";

    openModal("moneyItemModal");
}

function saveMoneyItem(event) {

    event.preventDefault();

    const period =
        getCurrentMoneyPeriod();

    if (!period) {
        return;
    }

    const id =
        document.getElementById(
            "moneyItemId"
        ).value;

    const name =
        document.getElementById(
            "moneyItemName"
        ).value.trim();

    const amount =
        number(
            document.getElementById(
                "moneyItemAmount"
            ).value
        );

    const date =
        document.getElementById(
            "moneyItemDate"
        ).value;

    const note =
        document.getElementById(
            "moneyItemNote"
        ).value.trim();


    if (!name || amount < 0 || !date) {
        showToast(
            "Completa los datos del item."
        );

        return;
    }


    if (id) {

        const item =
            period.items.find(
                item => item.id === id
            );

        if (item) {

            item.name = name;
            item.amount = round2(amount);
            item.date = date;
            item.note = note;
        }

    } else {

        period.items.push({

            id: uid("item"),

            name,

            amount:
                round2(amount),

            date,

            note,

            completed: false
        });
    }


    saveData();

    closeModal(
        "moneyItemModal"
    );

    renderMoney();

    renderDashboard();

    showToast(
        "Item guardado correctamente."
    );
}

function toggleMoneyItem(id) {

    const period =
        getCurrentMoneyPeriod();

    if (!period) {
        return;
    }

    const item =
        period.items.find(
            item => item.id === id
        );

    if (!item) {
        return;
    }

    item.completed =
        !item.completed;

    saveData();

    renderMoney();

    renderDashboard();

    if (item.completed) {

        showToast(
            `${item.name}: ${money(item.amount)} descontados.`
        );

    } else {

        showToast(
            `${item.name}: ${money(item.amount)} devueltos al disponible.`
        );
    }
}

function deleteMoneyItem(id) {

    const period =
        getCurrentMoneyPeriod();

    if (!period) {
        return;
    }

    const item =
        period.items.find(
            item => item.id === id
        );

    if (!item) {
        return;
    }

    if (
        !confirm(
            `¿Eliminar "${item.name}"?`
        )
    ) {
        return;
    }

    period.items =
        period.items.filter(
            item => item.id !== id
        );

    saveData();

    renderMoney();

    renderDashboard();

    showToast(
        "Item eliminado."
    );
}


/* =========================================================
   DEUDAS
   ========================================================= */

function calculateDebtStats(debt) {

    const schedule =
        debt.schedule || [];

    const extra =
        debt.extraPrincipalPayments || [];


    const scheduledPrincipalTotal =
        schedule.reduce(
            (sum, item) =>
                sum + number(item.principal),
            0
        );

    const scheduledInterestTotal =
        schedule.reduce(
            (sum, item) =>
                sum + number(item.interest),
            0
        );

    const actualPrincipal =
        schedule.reduce(
            (sum, item) =>
                sum + number(item.paidPrincipal),
            0
        );

    const actualInterest =
        schedule.reduce(
            (sum, item) =>
                sum + number(item.paidInterest),
            0
        );

    const extraPrincipal =
        extra.reduce(
            (sum, item) =>
                sum + number(item.amount),
            0
        );

    const totalPrincipal =
        actualPrincipal +
        extraPrincipal;

    const financed =
        number(debt.financed);

    const principalRemaining =
        Math.max(
            0,
            financed - totalPrincipal
        );

    const principalProgress =
        financed > 0
            ? clamp(
                totalPrincipal /
                financed *
                100,
                0,
                100
            )
            : 0;

    const paidInstallments =
        schedule.filter(
            item =>
                item.status === "paid" ||
                item.paidAmount >=
                    item.amount - 0.005
        ).length;

    const totalPaid =
        schedule.reduce(
            (sum, item) =>
                sum + number(item.paidAmount),
            0
        ) +
        extraPrincipal;


    return {

        scheduledPrincipalTotal:
            round2(
                scheduledPrincipalTotal
            ),

        scheduledInterestTotal:
            round2(
                scheduledInterestTotal
            ),

        actualPrincipal:
            round2(actualPrincipal),

        actualInterest:
            round2(actualInterest),

        extraPrincipal:
            round2(extraPrincipal),

        totalPrincipal:
            round2(totalPrincipal),

        principalRemaining:
            round2(principalRemaining),

        principalProgress:
            principalProgress,

        paidInstallments,

        totalPaid:
            round2(totalPaid)
    };
}

function renderDebts() {

    const container =
        document.getElementById(
            "debtsContent"
        );

    if (!data.debts.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="emoji">💳</div>

                <h3>No tienes deudas registradas</h3>

                <p>
                    Agrega una deuda para comenzar
                    a controlar sus cuotas.
                </p>

            </div>
        `;

        return;
    }


    container.innerHTML =
        data.debts.map(
            debt => {

                const stats =
                    calculateDebtStats(
                        debt
                    );

                const totalInstallments =
                    debt.schedule.length ||
                    number(debt.installments);

                const paid =
                    String(
                        stats.paidInstallments
                    ).padStart(2, "0");

                const total =
                    String(
                        totalInstallments
                    ).padStart(2, "0");


                return `

                    <div class="debt-card">

                        <div class="debt-card-top">

                            <div>

                                <h3>
                                    ${escapeHTML(
                                        debt.name
                                    )}
                                </h3>

                                <span class="installment-counter">
                                    ${paid}/${total} cuotas
                                </span>

                            </div>


                            <div
                                class="mini-progress"
                                style="
                                    --progress:
                                    ${stats.principalProgress.toFixed(2)}%;
                                "
                            >

                                <div class="mini-progress-inner">
                                    ${Math.round(
                                        stats.principalProgress
                                    )}%
                                </div>

                            </div>

                        </div>


                        <div class="progress-bar">

                            <div
                                class="progress-fill"
                                style="
                                    width:
                                    ${stats.principalProgress}%;
                                "
                            ></div>

                        </div>


                        <div class="card-stats">

                            <div class="card-stat">

                                <span>
                                    Financiado
                                </span>

                                <strong>
                                    ${money(
                                        debt.financed
                                    )}
                                </strong>

                            </div>

                            <div class="card-stat">

                                <span>
                                    Pagado capital
                                </span>

                                <strong>
                                    ${money(
                                        stats.totalPrincipal
                                    )}
                                </strong>

                            </div>

                            <div class="card-stat">

                                <span>
                                    Restante
                                </span>

                                <strong>
                                    ${money(
                                        stats.principalRemaining
                                    )}
                                </strong>

                            </div>

                        </div>


                        <div class="card-actions">

                            <button
                                class="secondary-btn"
                                onclick="
                                    openDebtDetail(
                                        '${debt.id}'
                                    )
                                "
                            >
                                Ver detalle
                            </button>

                            <button
                                class="secondary-btn"
                                onclick="
                                    editDebt(
                                        '${debt.id}'
                                    )
                                "
                            >
                                ✏️
                            </button>

                            <button
                                class="danger-outline-btn"
                                onclick="
                                    deleteDebt(
                                        '${debt.id}'
                                    )
                                "
                            >
                                🗑️
                            </button>

                        </div>

                    </div>

                `;
            }
        ).join("");
}

function openNewDebt() {

    document.getElementById(
        "debtModalTitle"
    ).textContent =
        "Nueva deuda";

    document.getElementById(
        "debtForm"
    ).reset();

    document.getElementById(
        "debtId"
    ).value = "";

    document.getElementById(
        "debtPremium"
    ).value = "0";

    document.getElementById(
        "debtFrequency"
    ).value = "monthly";

    document.getElementById(
        "debtFirstDate"
    ).value =
        todayISO();

    openModal("debtModal");
}

function editDebt(id) {

    const debt =
        data.debts.find(
            item => item.id === id
        );

    if (!debt) {
        return;
    }

    document.getElementById(
        "debtModalTitle"
    ).textContent =
        "Editar deuda";

    document.getElementById(
        "debtId"
    ).value =
        debt.id;

    document.getElementById(
        "debtName"
    ).value =
        debt.name;

    document.getElementById(
        "debtTotalPrice"
    ).value =
        debt.totalPrice;

    document.getElementById(
        "debtPremium"
    ).value =
        debt.premium;

    document.getElementById(
        "debtInstallments"
    ).value =
        debt.installments;

    document.getElementById(
        "debtPayment"
    ).value =
        debt.payment;

    document.getElementById(
        "debtFirstDate"
    ).value =
        debt.firstDate;

    document.getElementById(
        "debtFrequency"
    ).value =
        debt.frequency ||
        "monthly";

    openModal("debtModal");
}

function saveDebt(event) {

    event.preventDefault();

    const id =
        document.getElementById(
            "debtId"
        ).value;

    const name =
        document.getElementById(
            "debtName"
        ).value.trim();

    const totalPrice =
        number(
            document.getElementById(
                "debtTotalPrice"
            ).value
        );

    const premium =
        number(
            document.getElementById(
                "debtPremium"
            ).value
        );

    const installments =
        parseInt(
            document.getElementById(
                "debtInstallments"
            ).value,
            10
        );

    const payment =
        number(
            document.getElementById(
                "debtPayment"
            ).value
        );

    const firstDate =
        document.getElementById(
            "debtFirstDate"
        ).value;

    const frequency =
        document.getElementById(
            "debtFrequency"
        ).value;


    if (
        !name ||
        totalPrice < 0 ||
        premium < 0 ||
        installments < 1 ||
        payment < 0 ||
        !firstDate
    ) {

        showToast(
            "Completa correctamente los datos."
        );

        return;
    }


    const financed =
        round2(
            Math.max(
                0,
                totalPrice - premium
            )
        );


    if (id) {

        const debt =
            data.debts.find(
                item => item.id === id
            );

        if (debt) {

            debt.name = name;
            debt.totalPrice =
                totalPrice;

            debt.premium =
                premium;

            debt.financed =
                financed;

            debt.installments =
                installments;

            debt.payment =
                payment;

            debt.firstDate =
                firstDate;

            debt.frequency =
                frequency;
        }

        showToast(
            "Deuda actualizada."
        );

    } else {

        const debt = {

            id: uid("debt"),

            name,

            totalPrice,

            premium,

            premiumDate:
                todayISO(),

            financed,

            installments,

            payment,

            firstDate,

            frequency,

            schedule: [],

            payments: [],

            extraPrincipalPayments: [],

            createdAt:
                new Date().toISOString()
        };


        generateDebtSchedule(
            debt
        );

        data.debts.push(debt);

        showToast(
            "Deuda creada correctamente."
        );
    }


    saveData();

    closeModal(
        "debtModal"
    );

    renderDebts();

    renderDashboard();
}

function generateDebtSchedule(debt) {

    debt.schedule = [];

    for (
        let i = 0;
        i < debt.installments;
        i++
    ) {

        let dueDate;

        if (
            debt.frequency ===
            "weekly"
        ) {

            dueDate =
                addDays(
                    debt.firstDate,
                    i * 7
                );

        } else {

            dueDate =
                addMonths(
                    debt.firstDate,
                    i
                );
        }


        debt.schedule.push({

            id:
                uid("inst"),

            number:
                i + 1,

            dueDate,

            amount:
                round2(
                    debt.payment
                ),

            principal: 0,

            interest: 0,

            paidAmount: 0,

            paidPrincipal: 0,

            paidInterest: 0,

            paidDate: "",

            status: "pending"
        });
    }
}

function deleteDebt(id) {

    const debt =
        data.debts.find(
            item => item.id === id
        );

    if (!debt) {
        return;
    }

    if (
        !confirm(
            `¿Eliminar la deuda "${debt.name}"?\n\n` +
            "Se eliminarán sus cuotas y pagos."
        )
    ) {
        return;
    }

    data.debts =
        data.debts.filter(
            item => item.id !== id
        );

    saveData();

    renderDebts();

    renderDashboard();

    showToast(
        "Deuda eliminada."
    );
}


/* =========================================================
   DETALLE DEUDA
   ========================================================= */

function openDebtDetail(id) {

    const debt =
        data.debts.find(
            item => item.id === id
        );

    if (!debt) {
        return;
    }

    document.getElementById(
        "debtDetailTitle"
    ).textContent =
        debt.name;

    renderDebtDetail(debt);

    openModal(
        "debtDetailModal"
    );
}

function renderDebtDetail(debt) {

    const container =
        document.getElementById(
            "debtDetailContent"
        );

    const stats =
        calculateDebtStats(
            debt
        );


    container.innerHTML = `

        <div class="detail-summary">

            <div class="detail-stat">

                <span>
                    Financiado
                </span>

                <strong>
                    ${money(debt.financed)}
                </strong>

            </div>

            <div class="detail-stat">

                <span>
                    Capital pagado
                </span>

                <strong>
                    ${money(stats.totalPrincipal)}
                </strong>

            </div>

            <div class="detail-stat">

                <span>
                    Interés pagado
                </span>

                <strong>
                    ${money(stats.actualInterest)}
                </strong>

            </div>

            <div class="detail-stat">

                <span>
                    Capital restante
                </span>

                <strong>
                    ${money(
                        stats.principalRemaining
                    )}
                </strong>

            </div>

        </div>


        <div class="card-actions">

            <button
                class="primary-btn"
                onclick="
                    openExtraPrincipal(
                        '${debt.id}'
                    )
                "
            >
                + Abono a capital
            </button>

            <button
                class="secondary-btn"
                onclick="
                    editDebtSchedule(
                        '${debt.id}'
                    )
                "
            >
                ✏️ Amortización
            </button>

        </div>


        <h3 style="margin:22px 0 10px">
            Tabla de cuotas
        </h3>


        <div class="schedule-table-wrapper">

            <table class="schedule-table">

                <thead>

                    <tr>

                        <th>
                            #
                        </th>

                        <th>
                            Fecha
                        </th>

                        <th>
                            Cuota
                        </th>

                        <th>
                            Capital
                        </th>

                        <th>
                            Interés
                        </th>

                        <th>
                            Pagado
                        </th>

                        <th>
                            Estado
                        </th>

                        <th>
                            Acción
                        </th>

                    </tr>

                </thead>

                <tbody>

                    ${
                        debt.schedule.length
                            ? debt.schedule.map(
                                inst =>
                                    renderScheduleRow(
                                        debt,
                                        inst
                                    )
                              ).join("")
                            : `
                                <tr>
                                    <td colspan="8">
                                        No hay cuotas.
                                    </td>
                                </tr>
                            `
                    }

                </tbody>

            </table>

        </div>

    `;
}

function renderScheduleRow(
    debt,
    inst
) {

    const paid =
        inst.status === "paid" ||
        inst.paidAmount >=
            inst.amount - 0.005;

    return `

        <tr>

            <td>
                ${inst.number}
            </td>

            <td>
                ${formatDate(
                    inst.dueDate
                )}
            </td>

            <td>
                ${money(inst.amount)}
            </td>

            <td>
                ${money(inst.principal)}
            </td>

            <td>
                ${money(inst.interest)}
            </td>

            <td>
                ${money(inst.paidAmount)}
            </td>

            <td>

                <span
                    class="${
                        paid
                            ? "status-paid"
                            : "status-pending"
                    }"
                >
                    ${
                        paid
                            ? "Pagada"
                            : "Pendiente"
                    }
                </span>

            </td>

            <td>

                ${
                    paid
                        ? "✓"
                        : `
                            <button
                                class="small-btn"
                                onclick="
                                    openPayment(
                                        '${debt.id}',
                                        '${inst.id}'
                                    )
                                "
                            >
                                💵
                            </button>
                          `
                }

            </td>

        </tr>

    `;
}


/* =========================================================
   AMORTIZACIÓN
   ========================================================= */

function editDebtSchedule(id) {

    const debt =
        data.debts.find(
            item => item.id === id
        );

    if (!debt) {
        return;
    }

    const values =
        debt.schedule.map(
            inst => `
                <tr>

                    <td>
                        ${inst.number}
                    </td>

                    <td>
                        ${formatDate(
                            inst.dueDate
                        )}
                    </td>

                    <td>
                        ${money(inst.amount)}
                    </td>

                    <td>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value="${inst.principal}"
                            onchange="
                                updateScheduleValue(
                                    '${debt.id}',
                                    '${inst.id}',
                                    'principal',
                                    this.value
                                )
                            "
                        >
                    </td>

                    <td>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value="${inst.interest}"
                            onchange="
                                updateScheduleValue(
                                    '${debt.id}',
                                    '${inst.id}',
                                    'interest',
                                    this.value
                                )
                            "
                        >
                    </td>

                </tr>
            `
        ).join("");


    const container =
        document.getElementById(
            "debtDetailContent"
        );

    container.innerHTML = `

        <h3 style="margin-bottom:12px">
            Amortización de ${escapeHTML(
                debt.name
            )}
        </h3>

        <div class="info-box">

            Ingresa el capital y el interés
            contractual de cada cuota.

            <br><br>

            <strong>
                Capital + interés debe corresponder
                al valor de la cuota.
            </strong>

        </div>

        <div class="schedule-table-wrapper">

            <table class="schedule-table">

                <thead>

                    <tr>

                        <th>
                            #
                        </th>

                        <th>
                            Fecha
                        </th>

                        <th>
                            Cuota
                        </th>

                        <th>
                            Capital
                        </th>

                        <th>
                            Interés
                        </th>

                    </tr>

                </thead>

                <tbody>
                    ${values}
                </tbody>

            </table>

        </div>

        <button
            class="primary-btn full"
            style="margin-top:15px"
            onclick="
                openDebtDetail(
                    '${debt.id}'
                )
            "
        >
            Guardar y volver
        </button>

    `;
}

function updateScheduleValue(
    debtId,
    installmentId,
    field,
    value
) {

    const debt =
        data.debts.find(
            item => item.id === debtId
        );

    if (!debt) {
        return;
    }

    const inst =
        debt.schedule.find(
            item => item.id === installmentId
        );

    if (!inst) {
        return;
    }

    inst[field] =
        round2(number(value));

    saveData();
}


/* =========================================================
   PAGOS
   ========================================================= */

function openPayment(
    debtId,
    installmentId
) {

    const debt =
        data.debts.find(
            item => item.id === debtId
        );

    if (!debt) {
        return;
    }

    const inst =
        debt.schedule.find(
            item => item.id === installmentId
        );

    if (!inst) {
        return;
    }


    document.getElementById(
        "paymentDebtId"
    ).value =
        debtId;

    document.getElementById(
        "paymentInstallmentId"
    ).value =
        installmentId;

    document.getElementById(
        "paymentDate"
    ).value =
        todayISO();

    document.getElementById(
        "paymentAmount"
    ).value =
        Math.max(
            0,
            round2(
                inst.amount -
                inst.paidAmount
            )
        );


    updatePaymentPreview();

    openModal(
        "paymentModal"
    );
}

function updatePaymentPreview() {

    const debtId =
        document.getElementById(
            "paymentDebtId"
        ).value;

    const installmentId =
        document.getElementById(
            "paymentInstallmentId"
        ).value;

    const amount =
        number(
            document.getElementById(
                "paymentAmount"
            ).value
        );


    const debt =
        data.debts.find(
            item => item.id === debtId
        );

    if (!debt) {
        return;
    }

    const inst =
        debt.schedule.find(
            item =>
                item.id === installmentId
        );

    if (!inst) {
        return;
    }


    const remainingInterest =
        Math.max(
            0,
            number(inst.interest) -
            number(inst.paidInterest)
        );

    const remainingPrincipal =
        Math.max(
            0,
            number(inst.principal) -
            number(inst.paidPrincipal)
        );


    /*
      INTERÉS SIEMPRE PRIMERO.
    */

    const interest =
        Math.min(
            amount,
            remainingInterest
        );

    const afterInterest =
        amount - interest;

    const principal =
        Math.min(
            afterInterest,
            remainingPrincipal
        );

    const extra =
        Math.max(
            0,
            afterInterest -
            principal
        );


    const preview =
        document.getElementById(
            "paymentCalculation"
        );


    preview.innerHTML = `

        <strong>
            Distribución del pago
        </strong>

        <p style="margin-top:8px">

            Interés:
            <strong>
                ${money(interest)}
            </strong>

            <br>

            Capital:
            <strong>
                ${money(principal)}
            </strong>

            ${
                extra > 0
                    ? `
                        <br>
                        Abono extra a capital:
                        <strong>
                            ${money(extra)}
                        </strong>
                      `
                    : ""
            }

        </p>
    `;
}

function savePayment(event) {

    event.preventDefault();

    const debtId =
        document.getElementById(
            "paymentDebtId"
        ).value;

    const installmentId =
        document.getElementById(
            "paymentInstallmentId"
        ).value;

    const date =
        document.getElementById(
            "paymentDate"
        ).value;

    const amount =
        number(
            document.getElementById(
                "paymentAmount"
            ).value
        );


    const debt =
        data.debts.find(
            item => item.id === debtId
        );

    if (!debt) {
        return;
    }

    const inst =
        debt.schedule.find(
            item => item.id === installmentId
        );

    if (!inst) {
        return;
    }


    if (amount <= 0) {

        showToast(
            "El monto debe ser mayor a cero."
        );

        return;
    }


    const remainingInterest =
        Math.max(
            0,
            inst.interest -
            inst.paidInterest
        );

    const remainingPrincipal =
        Math.max(
            0,
            inst.principal -
            inst.paidPrincipal
        );


    /*
      1. INTERÉS
    */

    const interest =
        Math.min(
            amount,
            remainingInterest
        );


    /*
      2. CAPITAL
    */

    const afterInterest =
        amount -
        interest;

    const principal =
        Math.min(
            afterInterest,
            remainingPrincipal
        );


    /*
      3. EXCEDENTE
    */

    const extra =
        Math.max(
            0,
            afterInterest -
            principal
        );


    inst.paidInterest =
        round2(
            inst.paidInterest +
            interest
        );

    inst.paidPrincipal =
        round2(
            inst.paidPrincipal +
            principal
        );

    inst.paidAmount =
        round2(
            inst.paidAmount +
            interest +
            principal
        );


    if (
        inst.paidAmount >=
        inst.amount - 0.005
    ) {

        inst.status =
            "paid";

        inst.paidDate =
            date;

    } else {

        inst.status =
            "partial";
    }


    /*
      Guardar historial del pago.
    */

    debt.payments.push({

        id:
            uid("payment"),

        installmentId:
            inst.id,

        installmentNumber:
            inst.number,

        date,

        amount:
            round2(amount),

        principal:
            round2(principal),

        interest:
            round2(interest),

        extraPrincipal:
            round2(extra)
    });


    /*
      Si hubo excedente,
      se considera abono extraordinario
      automáticamente.
    */

    if (extra > 0) {

        debt.extraPrincipalPayments.push({

            id:
                uid("extra"),

            date,

            amount:
                round2(extra),

            note:
                `Excedente de pago de cuota #${inst.number}`
        });
    }


    saveData();

    closeModal(
        "paymentModal"
    );

    renderDebts();

    renderDashboard();

    showToast(
        "Pago registrado correctamente."
    );


    /*
      Si el detalle sigue abierto,
      actualizarlo.
    */

    const detailModal =
        document.getElementById(
            "debtDetailModal"
        );

    if (
        detailModal.classList.contains(
            "open"
        )
    ) {

        renderDebtDetail(
            debt
        );
    }
}


/* =========================================================
   ABONO EXTRA A CAPITAL
   ========================================================= */

function openExtraPrincipal(
    debtId
) {

    document.getElementById(
        "extraDebtId"
    ).value =
        debtId;

    document.getElementById(
        "extraDate"
    ).value =
        todayISO();

    document.getElementById(
        "extraAmount"
    ).value = "";

    document.getElementById(
        "extraNote"
    ).value = "";


    openModal(
        "extraPrincipalModal"
    );
}

function saveExtraPrincipal(event) {

    event.preventDefault();

    const debtId =
        document.getElementById(
            "extraDebtId"
        ).value;

    const date =
        document.getElementById(
            "extraDate"
        ).value;

    const amount =
        number(
            document.getElementById(
                "extraAmount"
            ).value
        );

    const note =
        document.getElementById(
            "extraNote"
        ).value.trim();


    const debt =
        data.debts.find(
            item => item.id === debtId
        );

    if (!debt) {
        return;
    }


    if (amount <= 0) {

        showToast(
            "El monto debe ser mayor a cero."
        );

        return;
    }


    debt.extraPrincipalPayments.push({

        id:
            uid("extra"),

        date,

        amount:
            round2(amount),

        note
    });


    saveData();

    closeModal(
        "extraPrincipalModal"
    );

    renderDebts();

    renderDashboard();

    renderDebtDetail(
        debt
    );

    showToast(
        "Abono a capital registrado."
    );
}


/* =========================================================
   METAS
   ========================================================= */

const GOAL_FREQUENCIES = {
    weekly: {
        label: "Semanal",
        every: "semana",
        step: 7
    },
    biweekly: {
        label: "Quincenal",
        every: "quincena",
        step: 15
    },
    monthly: {
        label: "Mensual",
        every: "mes",
        step: 0
    }
};

function goalISO(date) {

    const y = date.getFullYear();

    const m =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const d =
        String(date.getDate())
            .padStart(2, "0");

    return `${y}-${m}-${d}`;
}

function goalAddDays(iso, days) {

    const date =
        new Date(iso + "T00:00:00");

    date.setDate(
        date.getDate() + days
    );

    return goalISO(date);
}

function goalAddMonths(iso, months) {

    const date =
        new Date(iso + "T00:00:00");

    const day = date.getDate();

    date.setMonth(
        date.getMonth() + months
    );

    if (date.getDate() !== day) {
        date.setDate(0);
    }

    return goalISO(date);
}

function goalDaysBetween(a, b) {

    return Math.round(
        (
            new Date(b + "T00:00:00") -
            new Date(a + "T00:00:00")
        ) / 86400000
    );
}

function goalShortDate(iso) {

    const parts = iso.split("-");

    return (
        parts[2] + "/" +
        parts[1] + "/" +
        parts[0].slice(2)
    );
}

function goalPercent(value) {

    return value
        .toFixed(1)
        .replace(/\.0$/, "");
}

function goalCompactMoney(value) {

    if (value >= 1000) {

        return (
            "$" +
            (value / 1000).toFixed(
                value % 1000 === 0 ? 0 : 1
            ) +
            "k"
        );
    }

    return "$" + Math.round(value);
}


/*
  Calcula el plan de ahorro de una meta:
  cuánto abonar, cada cuándo, y la fecha final.
*/

function buildGoalPlan(goal) {

    const months =
        Math.round(number(goal.months));

    const freq =
        GOAL_FREQUENCIES[goal.frequency];

    if (
        !goal.startDate ||
        months < 1 ||
        !freq
    ) {
        return null;
    }

    const startDate = goal.startDate;

    const endDate =
        goalAddMonths(startDate, months);

    const target =
        round2(number(goal.target));

    const base =
        round2(number(goal.initialSaved));

    const saved =
        number(goal.saved);

    const needed =
        Math.max(0, round2(target - base));


    /*
      Fechas de cada abono.
    */

    const dates = [];

    if (freq.step === 0) {

        for (let k = 1; k <= months; k++) {
            dates.push(
                goalAddMonths(startDate, k)
            );
        }

    } else {

        let k = 1;

        let current =
            goalAddDays(startDate, freq.step);

        while (current < endDate) {

            dates.push(current);

            k++;

            current =
                goalAddDays(
                    startDate,
                    freq.step * k
                );
        }

        if (
            dates.length &&
            goalDaysBetween(
                dates[dates.length - 1],
                endDate
            ) < freq.step / 2
        ) {
            dates[dates.length - 1] = endDate;
        } else {
            dates.push(endDate);
        }
    }

    const count = dates.length;

    const amount =
        round2(needed / count);


    /*
      Calendario con acumulado esperado.
    */

    let cumulative = base;

    const rows = dates.map((date, index) => {

        const payment =
            index === count - 1
                ? round2(
                    needed -
                    amount * (count - 1)
                )
                : amount;

        cumulative =
            round2(cumulative + payment);

        return {
            number: index + 1,
            date,
            amount: payment,
            cumulative,
            paid:
                saved + 0.005 >= cumulative
        };
    });

    const next =
        rows.find(row => !row.paid) || null;

    return {
        startDate,
        endDate,
        base,
        amount,
        count,
        rows,
        next,
        amountDue:
            next
                ? round2(
                    next.cumulative - saved
                )
                : 0,
        freq
    };
}

function goalDonutSVG(progress, completed) {

    const radius = 26;

    const circumference =
        2 * Math.PI * radius;

    const offset =
        circumference *
        (1 - progress / 100);

    const percent =
        goalPercent(progress);

    return `
        <svg
            class="goal-donut"
            viewBox="0 0 64 64"
            role="img"
            aria-label="${percent}% completado"
        >
            <circle
                class="gd-track"
                cx="32"
                cy="32"
                r="${radius}"
            />

            <circle
                class="gd-fill ${completed ? "done" : ""}"
                cx="32"
                cy="32"
                r="${radius}"
                stroke-dasharray="${circumference.toFixed(2)}"
                stroke-dashoffset="${offset.toFixed(2)}"
                transform="rotate(-90 32 32)"
            />

            <text
                class="gd-text"
                x="32"
                y="37"
                text-anchor="middle"
            >${percent}%</text>
        </svg>
    `;
}

function goalChartSVG(goal, plan) {

    const W = 320;
    const H = 180;
    const L = 46;
    const R = 14;
    const T = 16;
    const B = 28;

    const pw = W - L - R;
    const ph = H - T - B;

    const target =
        Math.max(number(goal.target), 0.01);

    const saved =
        number(goal.saved);

    const today =
        todayISO();


    /*
      Evolución real: se reconstruye
      a partir de los movimientos.
    */

    const contributions =
        (goal.contributions || [])
            .filter(item => item.date)
            .slice()
            .sort((a, b) =>
                a.date.localeCompare(b.date)
            );

    const signed = item =>
        (
            item.type === "withdraw"
                ? -1
                : 1
        ) * number(item.amount);

    const totalDelta =
        contributions.reduce(
            (sum, item) =>
                sum + signed(item),
            0
        );

    let running =
        round2(saved - totalDelta);

    const firstDate =
        contributions.length &&
        contributions[0].date <
            plan.startDate
            ? contributions[0].date
            : plan.startDate;

    const real = [
        {
            date: firstDate,
            value: running
        }
    ];

    contributions.forEach(item => {

        running =
            round2(running + signed(item));

        real.push({
            date: item.date,
            value: running
        });
    });

    if (
        today > real[real.length - 1].date
    ) {
        real.push({
            date: today,
            value: saved
        });
    }


    /*
      Plan.
    */

    const planned = [
        {
            date: plan.startDate,
            value: plan.base
        }
    ].concat(
        plan.rows.map(row => ({
            date: row.date,
            value: row.cumulative
        }))
    );


    /*
      Escalas.
    */

    const dayMs = 86400000;

    const time = iso =>
        new Date(iso + "T00:00:00")
            .getTime();

    const minDate =
        firstDate < plan.startDate
            ? firstDate
            : plan.startDate;

    const maxCandidates = [
        plan.endDate,
        today,
        real[real.length - 1].date
    ].sort();

    const maxDate =
        maxCandidates[
            maxCandidates.length - 1
        ];

    const t0 = time(minDate);

    const t1 =
        Math.max(
            time(maxDate),
            t0 + dayMs
        );

    const x = iso =>
        L +
        (
            (time(iso) - t0) /
            (t1 - t0)
        ) * pw;

    const y = value =>
        T + ph -
        clamp(value / target, 0, 1) * ph;

    const toPoints = list =>
        list
            .map(point =>
                x(point.date).toFixed(1) +
                "," +
                y(point.value).toFixed(1)
            )
            .join(" ");


    const grid =
        [0, 0.5, 1]
            .map(fraction => {

                const yy =
                    (
                        T + ph -
                        fraction * ph
                    ).toFixed(1);

                return `
                    <line
                        class="gc-grid"
                        x1="${L}"
                        y1="${yy}"
                        x2="${W - R}"
                        y2="${yy}"
                    />

                    <text
                        class="gc-label"
                        x="${L - 6}"
                        y="${(Number(yy) + 3).toFixed(1)}"
                        text-anchor="end"
                    >${goalCompactMoney(
                        target * fraction
                    )}</text>
                `;
            })
            .join("");


    const areaPoints =
        toPoints(real);

    const lastReal =
        real[real.length - 1];

    const area =
        `${x(real[0].date).toFixed(1)},${(T + ph).toFixed(1)} ` +
        areaPoints +
        ` ${x(lastReal.date).toFixed(1)},${(T + ph).toFixed(1)}`;


    const planDots =
        planned.length <= 14
            ? planned
                .slice(1)
                .map(point => `
                    <circle
                        class="gc-plan-dot"
                        cx="${x(point.date).toFixed(1)}"
                        cy="${y(point.value).toFixed(1)}"
                        r="2.5"
                    />
                `)
                .join("")
            : "";


    const todayLine =
        today >= minDate &&
        today <= maxDate
            ? `
                <line
                    class="gc-today"
                    x1="${x(today).toFixed(1)}"
                    y1="${T}"
                    x2="${x(today).toFixed(1)}"
                    y2="${T + ph}"
                />

                <text
                    class="gc-today-label"
                    x="${x(today).toFixed(1)}"
                    y="${T - 4}"
                    text-anchor="middle"
                >Hoy</text>
            `
            : "";


    return `
        <svg
            class="goal-chart"
            viewBox="0 0 ${W} ${H}"
            role="img"
            aria-label="Gráfica de progreso de la meta"
        >

            ${grid}

            <polygon
                class="gc-area"
                points="${area}"
            />

            <polyline
                class="gc-plan"
                points="${toPoints(planned)}"
            />

            ${planDots}

            ${todayLine}

            <polyline
                class="gc-real"
                points="${areaPoints}"
            />

            <circle
                class="gc-real-dot"
                cx="${x(lastReal.date).toFixed(1)}"
                cy="${y(lastReal.value).toFixed(1)}"
                r="3.5"
            />

            <text
                class="gc-label"
                x="${x(plan.startDate).toFixed(1)}"
                y="${H - 8}"
                text-anchor="start"
            >${goalShortDate(plan.startDate)}</text>

            <text
                class="gc-label"
                x="${x(plan.endDate).toFixed(1)}"
                y="${H - 8}"
                text-anchor="end"
            >${goalShortDate(plan.endDate)}</text>

        </svg>

        <div class="goal-legend">

            <span>
                <i class="lg-real"></i>
                Ahorro real
            </span>

            <span>
                <i class="lg-plan"></i>
                Plan
            </span>

        </div>
    `;
}

function goalScheduleHTML(plan) {

    const rows =
        plan.rows
            .map(row => `
                <div class="goal-schedule-row ${
                    row.paid
                        ? "paid"
                        : (
                            plan.next &&
                            plan.next.number ===
                                row.number
                                ? "next"
                                : ""
                        )
                }">

                    <span>${row.number}</span>

                    <span>${formatDate(row.date)}</span>

                    <span>${money(row.amount)}</span>

                    <span>${
                        row.paid ? "✅" : ""
                    }</span>

                </div>
            `)
            .join("");

    return `
        <details class="goal-schedule">

            <summary>
                📅 Calendario de abonos
                (${plan.count})
            </summary>

            ${rows}

        </details>
    `;
}

function renderGoals() {

    const container =
        document.getElementById(
            "goalsContent"
        );

    if (!container) {
        return;
    }

    if (!data.goals.length) {

        container.innerHTML = `
            <div class="empty-state">

                <div class="emoji">🎯</div>

                <h3>No tienes metas</h3>

                <p>
                    Toca "+ Nueva meta" para crear
                    un plan de ahorro.
                </p>

            </div>
        `;

        return;
    }

    const today = todayISO();

    container.innerHTML =
        data.goals.map(
            goal => {

                const target =
                    number(goal.target);

                const saved =
                    number(goal.saved);

                const progress =
                    target > 0
                        ? clamp(
                            saved /
                            target *
                            100,
                            0,
                            100
                        )
                        : 0;

                const remaining =
                    Math.max(
                        0,
                        target - saved
                    );

                const completed =
                    target > 0 &&
                    saved >= target;

                const plan =
                    buildGoalPlan(goal);


                /*
                  Próximo abono.
                */

                let nextBox = "";

                if (completed) {

                    nextBox = `
                        <div class="goal-next done">
                            🎉 ¡Meta alcanzada!
                        </div>
                    `;

                } else if (plan && plan.next) {

                    const late =
                        plan.next.date < today;

                    nextBox = late
                        ? `
                            <div class="goal-next late">
                                ⚠️ Abono atrasado:
                                debes abonar
                                <strong>${money(plan.amountDue)}</strong>
                                (venció el
                                ${formatDate(plan.next.date)}).
                            </div>
                        `
                        : `
                            <div class="goal-next">
                                📌 Próximo abono:
                                <strong>${money(plan.amountDue)}</strong>
                                el
                                ${formatDate(plan.next.date)}.
                            </div>
                        `;
                }


                const planGrid = plan
                    ? `
                        <div class="goal-plan-grid">

                            <div class="goal-plan-item">
                                <span>
                                    Abono
                                    ${plan.freq.label.toLowerCase()}
                                </span>
                                <strong>
                                    ${money(plan.amount)}
                                </strong>
                            </div>

                            <div class="goal-plan-item">
                                <span>
                                    Cantidad de abonos
                                </span>
                                <strong>
                                    ${plan.count}
                                </strong>
                            </div>

                            <div class="goal-plan-item">
                                <span>Inicio</span>
                                <strong>
                                    ${formatDate(plan.startDate)}
                                </strong>
                            </div>

                            <div class="goal-plan-item">
                                <span>Finaliza</span>
                                <strong>
                                    ${formatDate(plan.endDate)}
                                </strong>
                            </div>

                        </div>
                    `
                    : `
                        <p class="goal-meta-line">
                            Esta meta no tiene plan de ahorro.
                            Toca ✏️ para indicar la fecha de inicio,
                            los meses y la frecuencia de abono.
                        </p>
                    `;


                const lastMovements =
                    (goal.contributions || [])
                        .slice(-3)
                        .reverse()
                        .map(item => `
                            <div class="goal-movement">

                                <span>
                                    ${formatDate(item.date)}
                                    ${
                                        item.note
                                            ? "· " +
                                              escapeHTML(item.note)
                                            : ""
                                    }
                                </span>

                                <strong class="${
                                    item.type === "withdraw"
                                        ? "goal-out"
                                        : "goal-in"
                                }">
                                    ${
                                        item.type === "withdraw"
                                            ? "−"
                                            : "+"
                                    }${money(item.amount)}
                                </strong>

                            </div>
                        `)
                        .join("");


                return `

                    <div class="goal-card ${
                        completed
                            ? "goal-completed"
                            : ""
                    }">

                        <div class="debt-card-top">

                            <div>

                                <h3>
                                    ${escapeHTML(
                                        goal.name
                                    )}
                                </h3>

                                <span class="installment-counter">
                                    ${money(saved)}
                                    de
                                    ${money(target)}
                                </span>

                            </div>

                            ${goalDonutSVG(
                                progress,
                                completed
                            )}

                        </div>


                        <div class="goal-progress">

                            <div class="goal-progress-row">

                                <span>
                                    ${goalPercent(progress)}%
                                    completado
                                </span>

                                <span>
                                    Falta:
                                    ${money(remaining)}
                                </span>

                            </div>

                            <div class="progress-bar">

                                <div
                                    class="progress-fill"
                                    style="width:${progress}%"
                                ></div>

                            </div>

                        </div>

                        ${nextBox}

                        ${planGrid}

                        ${
                            plan
                                ? goalChartSVG(goal, plan)
                                : ""
                        }

                        ${
                            plan
                                ? goalScheduleHTML(plan)
                                : ""
                        }

                        ${
                            goal.note
                                ? `<p class="goal-meta-line">
                                       ${escapeHTML(goal.note)}
                                   </p>`
                                : ""
                        }

                        ${
                            lastMovements
                                ? `<div class="goal-movements">
                                       ${lastMovements}
                                   </div>`
                                : ""
                        }


                        <div class="card-actions">

                            <button
                                class="secondary-btn"
                                onclick="openGoalContribution('${goal.id}')"
                            >
                                💵 Abonar / Retirar
                            </button>

                            <button
                                class="secondary-btn"
                                onclick="editGoal('${goal.id}')"
                                title="Editar"
                            >
                                ✏️
                            </button>

                            <button
                                class="danger-outline-btn"
                                onclick="deleteGoal('${goal.id}')"
                                title="Eliminar"
                            >
                                🗑️
                            </button>

                        </div>

                    </div>

                `;
            }
        ).join("");
}

function readGoalForm() {

    return {
        id:
            document.getElementById(
                "goalId"
            ).value,

        name:
            document.getElementById(
                "goalName"
            ).value.trim(),

        target:
            round2(
                number(
                    document.getElementById(
                        "goalTarget"
                    ).value
                )
            ),

        saved:
            round2(
                number(
                    document.getElementById(
                        "goalSaved"
                    ).value
                )
            ),

        startDate:
            document.getElementById(
                "goalStartDate"
            ).value,

        months:
            Math.round(
                number(
                    document.getElementById(
                        "goalMonths"
                    ).value
                )
            ),

        frequency:
            document.getElementById(
                "goalFrequency"
            ).value,

        note:
            document.getElementById(
                "goalNote"
            ).value.trim()
    };
}

/*
  El plan se reinicia desde lo ahorrado hoy
  solo si cambian monto, inicio, meses o frecuencia.
  Si no, se conserva la base original.
*/

function goalPlanBase(existing, form) {

    if (!existing) {
        return form.saved;
    }

    const changed =
        existing.startDate !== form.startDate ||
        number(existing.months) !== form.months ||
        existing.frequency !== form.frequency ||
        number(existing.target) !== form.target;

    return changed
        ? form.saved
        : number(existing.initialSaved);
}

function updateGoalPreview() {

    const box =
        document.getElementById(
            "goalPlanPreview"
        );

    if (!box) {
        return;
    }

    const form = readGoalForm();

    const existing =
        data.goals.find(
            item => item.id === form.id
        );

    if (
        form.target <= 0 ||
        !form.startDate ||
        form.months < 1
    ) {

        box.innerHTML = `
            <strong>Plan de ahorro</strong>

            <p>
                Completa el monto, la fecha de inicio
                y los meses para ver cuánto debes abonar.
            </p>
        `;

        return;
    }

    const plan =
        buildGoalPlan({
            target: form.target,
            saved: form.saved,
            startDate: form.startDate,
            months: form.months,
            frequency: form.frequency,
            initialSaved:
                goalPlanBase(existing, form)
        });

    if (!plan) {
        return;
    }

    box.innerHTML = `
        <strong>Plan de ahorro</strong>

        <p>
            Abonarás
            <strong>${money(plan.amount)}</strong>
            cada ${plan.freq.every}
            (${plan.count} abonos).
            Empiezas el ${formatDate(plan.startDate)}
            y terminas el ${formatDate(plan.endDate)}.
        </p>
    `;
}

function openNewGoal() {

    document.getElementById(
        "goalModalTitle"
    ).textContent =
        "Nueva meta";

    document.getElementById(
        "goalForm"
    ).reset();

    document.getElementById(
        "goalId"
    ).value = "";

    document.getElementById(
        "goalSaved"
    ).value = "0";

    document.getElementById(
        "goalStartDate"
    ).value = todayISO();

    document.getElementById(
        "goalFrequency"
    ).value = "monthly";

    updateGoalPreview();

    openModal("goalModal");
}

function editGoal(id) {

    const goal =
        data.goals.find(
            item => item.id === id
        );

    if (!goal) {
        return;
    }

    document.getElementById(
        "goalModalTitle"
    ).textContent =
        "Editar meta";

    document.getElementById("goalId").value =
        goal.id;

    document.getElementById("goalName").value =
        goal.name;

    document.getElementById("goalTarget").value =
        goal.target;

    document.getElementById("goalSaved").value =
        goal.saved;

    document.getElementById("goalStartDate").value =
        goal.startDate || todayISO();

    document.getElementById("goalMonths").value =
        goal.months > 0
            ? goal.months
            : "";

    document.getElementById("goalFrequency").value =
        goal.frequency || "monthly";

    document.getElementById("goalNote").value =
        goal.note || "";

    updateGoalPreview();

    openModal("goalModal");
}

function saveGoal(event) {

    event.preventDefault();

    const form = readGoalForm();

    if (
        !form.name ||
        form.target <= 0 ||
        form.saved < 0 ||
        !form.startDate ||
        form.months < 1
    ) {

        showToast(
            "Completa los datos de la meta."
        );

        return;
    }

    if (form.id) {

        const goal =
            data.goals.find(
                item => item.id === form.id
            );

        if (!goal) {
            return;
        }

        const base =
            goalPlanBase(goal, form);

        goal.name = form.name;
        goal.target = form.target;
        goal.saved = form.saved;
        goal.startDate = form.startDate;
        goal.months = form.months;
        goal.frequency = form.frequency;
        goal.initialSaved = base;
        goal.note = form.note;

    } else {

        data.goals.push({
            id: uid("goal"),
            name: form.name,
            target: form.target,
            saved: form.saved,
            initialSaved: form.saved,
            startDate: form.startDate,
            months: form.months,
            frequency: form.frequency,
            note: form.note,
            contributions: [],
            createdAt: todayISO()
        });
    }

    saveData();

    closeModal("goalModal");

    renderGoals();

    renderDashboard();

    showToast(
        form.id
            ? "Meta actualizada."
            : "Meta creada."
    );
}

function deleteGoal(id) {

    const goal =
        data.goals.find(
            item => item.id === id
        );

    if (!goal) {
        return;
    }

    if (
        !confirm(
            `¿Eliminar la meta "${goal.name}"?`
        )
    ) {
        return;
    }

    data.goals =
        data.goals.filter(
            item => item.id !== id
        );

    saveData();

    renderGoals();

    renderDashboard();

    showToast("Meta eliminada.");
}

function openGoalContribution(id) {

    const goal =
        data.goals.find(
            item => item.id === id
        );

    if (!goal) {
        return;
    }

    document.getElementById(
        "goalContributionForm"
    ).reset();

    document.getElementById(
        "contributionGoalId"
    ).value = goal.id;

    document.getElementById(
        "contributionDate"
    ).value = todayISO();

    const suggestedPlan =
        buildGoalPlan(goal);

    if (
        suggestedPlan &&
        suggestedPlan.next &&
        suggestedPlan.amountDue > 0
    ) {

        document.getElementById(
            "contributionAmount"
        ).value =
            suggestedPlan.amountDue;
    }

    document.getElementById(
        "contributionInfo"
    ).innerHTML = `
        <div class="info-box">

            <strong>${escapeHTML(goal.name)}</strong>

            <p>
                Ahorrado: ${money(goal.saved)}
                de ${money(goal.target)}
            </p>

        </div>
    `;

    openModal("goalContributionModal");
}

function saveGoalContribution(event) {

    event.preventDefault();

    const goal =
        data.goals.find(
            item =>
                item.id ===
                document.getElementById(
                    "contributionGoalId"
                ).value
        );

    if (!goal) {
        return;
    }

    const type =
        document.getElementById(
            "contributionType"
        ).value === "withdraw"
            ? "withdraw"
            : "add";

    const amount =
        round2(
            number(
                document.getElementById(
                    "contributionAmount"
                ).value
            )
        );

    const date =
        document.getElementById(
            "contributionDate"
        ).value;

    const note =
        document.getElementById(
            "contributionNote"
        ).value.trim();


    if (amount <= 0 || !date) {

        showToast(
            "Ingresa un monto y una fecha válidos."
        );

        return;
    }

    if (
        type === "withdraw" &&
        amount > number(goal.saved)
    ) {

        showToast(
            "No puedes retirar más de lo ahorrado."
        );

        return;
    }


    goal.saved =
        round2(
            number(goal.saved) +
            (
                type === "withdraw"
                    ? -amount
                    : amount
            )
        );

    if (!Array.isArray(goal.contributions)) {
        goal.contributions = [];
    }

    goal.contributions.push({
        id: uid("contrib"),
        type,
        amount,
        date,
        note
    });

    saveData();

    closeModal("goalContributionModal");

    renderGoals();

    renderDashboard();

    showToast(
        type === "withdraw"
            ? "Retiro registrado."
            : "Abono registrado."
    );
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {

    const container =
        document.getElementById(
            "dashboardContent"
        );

    const period =
        getCurrentMoneyPeriod();

    const stats =
        getMoneyStats(period);


    const totalDebtRemaining =
        data.debts.reduce(
            (sum, debt) =>
                sum +
                calculateDebtStats(
                    debt
                ).principalRemaining,
            0
        );


    const totalGoalsRemaining =
        data.goals.reduce(
            (sum, goal) =>
                sum +
                Math.max(
                    0,
                    number(goal.target) -
                    number(goal.saved)
                ),
            0
        );


    document.getElementById(
        "summaryDebt"
    ).textContent =
        money(totalDebtRemaining);

    document.getElementById(
        "summaryGoals"
    ).textContent =
        money(totalGoalsRemaining);

    document.getElementById(
        "summaryMoney"
    ).textContent =
        money(stats.available);


    let moneyBlock = "";

    if (period) {

        moneyBlock = `

            <div class="dashboard-block">

                <div class="dashboard-money">

                    <div>

                        <small>
                            Mi Dinero ·
                            ${escapeHTML(
                                period.name
                            )}
                        </small>

                        <strong>
                            ${money(
                                stats.available
                            )}
                        </strong>

                    </div>

                    <button
                        class="secondary-btn"
                        onclick="
                            showSection('money')
                        "
                    >
                        Ver
                    </button>

                </div>

                <p
                    style="
                        margin-top:8px;
                        color:var(--muted);
                        font-size:12px;
                    "
                >
                    ${formatDate(
                        period.start
                    )}
                    →
                    ${formatDate(
                        period.end
                    )}
                </p>

            </div>
        `;

    } else {

        moneyBlock = `

            <div class="dashboard-block">

                <h3>
                    💰 Mi Dinero
                </h3>

                <p
                    style="
                        color:var(--muted);
                        margin-top:5px;
                    "
                >
                    Todavía no tienes un período.
                </p>

                <button
                    class="primary-btn"
                    style="margin-top:12px"
                    onclick="
                        openNewPeriod()
                    "
                >
                    + Crear período
                </button>

            </div>
        `;
    }


    container.innerHTML = `

        ${moneyBlock}


        <div class="dashboard-block">

            <h3>
                💳 Deudas
            </h3>

            <p
                style="
                    color:var(--muted);
                    margin-top:5px;
                "
            >
                ${
                    data.debts.length
                        ? `${data.debts.length} deuda(s) registrada(s).`
                        : "No tienes deudas registradas."
                }
            </p>

            <button
                class="secondary-btn"
                style="margin-top:12px"
                onclick="
                    showSection('debts')
                "
            >
                Ver deudas
            </button>

        </div>


        <div class="dashboard-block">

            <h3>
                🎯 Metas
            </h3>

            <p
                style="
                    color:var(--muted);
                    margin-top:5px;
                "
            >
                ${
                    data.goals.length
                        ? `${data.goals.length} meta(s) registrada(s).`
                        : "No tienes metas registradas."
                }
            </p>

            <button
                class="secondary-btn"
                style="margin-top:12px"
                onclick="
                    showSection('goals')
                "
            >
                Ver metas
            </button>

        </div>
    `;
}


/* =========================================================
   EXPORTAR / RESTAURAR
   ========================================================= */

function exportBackup() {

    const backup = {

        app:
            "FinanTrack",

        version:
            "0.5.0",

        exportedAt:
            new Date().toISOString(),

        data:
            data
    };


    const json =
        JSON.stringify(
            backup,
            null,
            2
        );


    const blob =
        new Blob(
            [json],
            {
                type:
                    "application/json"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const anchor =
        document.createElement(
            "a"
        );

    anchor.href =
        url;

    anchor.download =
        `FinanTrack_backup_${todayISO()}.json`;

    document.body.appendChild(
        anchor
    );

    anchor.click();

    anchor.remove();

    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 1000);


    closeModal("menuModal");

    showToast(
        "Respaldo exportado correctamente."
    );
}

function restoreBackup() {

    document.getElementById(
        "restoreFile"
    ).click();
}

function processRestoreFile(event) {

    const file =
        event.target.files[0];

    if (!file) {
        return;
    }


    const reader =
        new FileReader();


    reader.onload =
        function () {

            try {

                const backup =
                    JSON.parse(
                        reader.result
                    );


                /*
                  Aceptamos:

                  FinanTrack v0.5.0:
                  {
                     app,
                     version,
                     exportedAt,
                     data
                  }

                  También permitimos
                  archivos que directamente
                  contengan debts/goals.
                */

                let importedData;


                if (
                    backup &&
                    backup.data
                ) {

                    importedData =
                        backup.data;

                } else {

                    importedData =
                        backup;
                }


                if (
                    !importedData ||
                    !Array.isArray(
                        importedData.debts
                    ) ||
                    !Array.isArray(
                        importedData.goals
                    )
                ) {

                    throw new Error(
                        "Archivo inválido."
                    );
                }


                if (
                    !Array.isArray(
                        importedData.moneyPeriods
                    )
                ) {

                    importedData.moneyPeriods =
                        [];
                }


                if (
                    !confirm(
                        "Restaurar el respaldo reemplazará los datos actuales de FinanTrack.\n\n" +
                        "¿Deseas continuar?"
                    )
                ) {

                    event.target.value = "";

                    return;
                }


                data =
                    normalizeData(
                        importedData
                    );


                currentMoneyPeriodId =
                    data.moneyPeriods.length
                        ? data.moneyPeriods[
                            data.moneyPeriods.length - 1
                          ].id
                        : null;


                saveData();

                renderAll();

                closeModal(
                    "menuModal"
                );

                showToast(
                    "Respaldo restaurado correctamente."
                );


            } catch (error) {

                console.error(
                    error
                );

                showToast(
                    "No se pudo restaurar el archivo."
                );
            }


            event.target.value = "";
        };


    reader.readAsText(
        file
    );
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   EVENTOS
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadData();

        /*
          Seleccionar período actual.
        */

        if (
            data.moneyPeriods.length
        ) {

            const sorted =
                [...data.moneyPeriods].sort(
                    (a, b) =>
                        b.start.localeCompare(
                            a.start
                        )
                );

            currentMoneyPeriodId =
                sorted[0].id;
        }


        /*
          Navegación.
        */

        document
            .querySelectorAll(
                ".tab-btn"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        showSection(
                            button.dataset.section
                        );
                    }
                );
            });


        /*
          Menú.
        */

        document
            .getElementById(
                "btnMenu"
            )
            .addEventListener(
                "click",
                () => {
                    openModal(
                        "menuModal"
                    );
                }
            );


        /*
          Períodos.
        */

        document
            .getElementById(
                "btnNewPeriod"
            )
            .addEventListener(
                "click",
                openNewPeriod
            );


        document
            .getElementById(
                "btnEditPeriod"
            )
            .addEventListener(
                "click",
                editCurrentPeriod
            );


        document
            .getElementById(
                "btnDeletePeriod"
            )
            .addEventListener(
                "click",
                deleteCurrentPeriod
            );


        document
            .getElementById(
                "periodSelector"
            )
            .addEventListener(
                "change",
                event => {

                    currentMoneyPeriodId =
                        event.target.value ||
                        null;

                    renderMoney();
                }
            );


        document
            .getElementById(
                "periodForm"
            )
            .addEventListener(
                "submit",
                savePeriod
            );


        /*
          Items Mi Dinero.
        */

        document
            .getElementById(
                "btnNewMoneyItem"
            )
            .addEventListener(
                "click",
                openNewMoneyItem
            );


        document
            .getElementById(
                "moneyItemForm"
            )
            .addEventListener(
                "submit",
                saveMoneyItem
            );


        /*
          Deudas.
        */

        document
            .getElementById(
                "btnNewDebt"
            )
            .addEventListener(
                "click",
                openNewDebt
            );


        document
            .getElementById(
                "debtForm"
            )
            .addEventListener(
                "submit",
                saveDebt
            );


        document
            .getElementById(
                "paymentForm"
            )
            .addEventListener(
                "submit",
                savePayment
            );


        document
            .getElementById(
                "paymentAmount"
            )
            .addEventListener(
                "input",
                updatePaymentPreview
            );


        document
            .getElementById(
                "extraPrincipalForm"
            )
            .addEventListener(
                "submit",
                saveExtraPrincipal
            );


        /*
          Metas.
        */

        document
            .getElementById(
                "btnNewGoal"
            )
            .addEventListener(
                "click",
                openNewGoal
            );


        document
            .getElementById(
                "goalForm"
            )
            .addEventListener(
                "submit",
                saveGoal
            );


        [
            "goalTarget",
            "goalSaved",
            "goalStartDate",
            "goalMonths",
            "goalFrequency"
        ].forEach(fieldId => {

            document
                .getElementById(fieldId)
                .addEventListener(
                    "input",
                    updateGoalPreview
                );
        });


        document
            .getElementById(
                "goalContributionForm"
            )
            .addEventListener(
                "submit",
                saveGoalContribution
            );


        /*
          Menú exportar/restaurar.
        */

        document
            .getElementById(
                "btnExport"
            )
            .addEventListener(
                "click",
                exportBackup
            );


        document
            .getElementById(
                "btnRestore"
            )
            .addEventListener(
                "click",
                restoreBackup
            );


        document
            .getElementById(
                "restoreFile"
            )
            .addEventListener(
                "change",
                processRestoreFile
            );


        /*
          Cerrar modales.
        */

        document
            .querySelectorAll(
                "[data-close]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        closeModal(
                            button.dataset.close
                        );
                    }
                );
            });


        document
            .querySelectorAll(
                ".modal"
            )
            .forEach(modal => {

                modal.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target ===
                            modal
                        ) {

                            modal.classList.remove(
                                "open"
                            );
                        }
                    }
                );
            });


        /*
          ESC para cerrar.
        */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeAllModals();
                }
            }
        );


        renderAll();
    }
);


/* =========================================================
   RENDER GENERAL
   ========================================================= */

function renderAll() {

    renderDashboard();

    renderMoney();

    renderDebts();

    renderGoals();
}


/* =========================================================
   FUNCIONES GLOBALES PARA HTML INLINE
   ========================================================= */

window.openNewPeriod =
    openNewPeriod;

window.editMoneyItem =
    editMoneyItem;

window.deleteMoneyItem =
    deleteMoneyItem;

window.toggleMoneyItem =
    toggleMoneyItem;

window.openDebtDetail =
    openDebtDetail;

window.editDebt =
    editDebt;

window.deleteDebt =
    deleteDebt;

window.openPayment =
    openPayment;

window.openExtraPrincipal =
    openExtraPrincipal;

window.editDebtSchedule =
    editDebtSchedule;

window.updateScheduleValue =
    updateScheduleValue;

window.showSection =
    showSection;

window.openNewGoal =
    openNewGoal;

window.editGoal =
    editGoal;

window.deleteGoal =
    deleteGoal;

window.openGoalContribution =
    openGoalContribution;
