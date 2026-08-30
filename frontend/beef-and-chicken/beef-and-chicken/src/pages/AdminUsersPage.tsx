import { useEffect, useState, type FormEvent } from "react";
import { AppRoles, type AppRole } from "../auth/roles";
import { useAuth } from "../auth/AuthContext";
import {
  anonymizeUser,
  blockUser,
  createUserByAdmin,
  getAdminUsers,
  unblockUser,
  updateUserByAdmin,
  updateUserRoles,
  type AdminUserDto,
  type AdminUsersStatus,
  type PagedResultDto,
} from "../api/adminUsersApi";
import { getApiErrorMessage } from "../utils/apiErrors";
import { PaginationControls } from "../components/PaginationControls";
import {
  AdminUserForm,
  type AdminUserFormState,
} from "../components/admin/users/AdminUserForm";
import { AdminUsersFilters } from "../components/admin/users/AdminUsersFilters";
import { AdminUsersTable } from "../components/admin/users/AdminUsersTable";
import { useAppDialog } from "../components/dialogs/AppDialogContext";
import "../styles/AdminUsersPage.scss";

const emptyForm: AdminUserFormState = {
  userName: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  roles: [AppRoles.Customer],
};

const pageSize = 10;

type UsersTab = "staff" | "customers";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { alert: showAlert, confirm } = useAppDialog();

  const currentUserId = currentUser?.id ? Number(currentUser.id) : null;

  const [form, setForm] = useState<AdminUserFormState>(emptyForm);

  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const [staffResult, setStaffResult] =
    useState<PagedResultDto<AdminUserDto> | null>(null);

  const [customersResult, setCustomersResult] =
    useState<PagedResultDto<AdminUserDto> | null>(null);

  const [staffPage, setStaffPage] = useState(1);
  const [customerPage, setCustomerPage] = useState(1);

  const [staffSearch, setStaffSearch] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");

  const [staffStatus, setStaffStatus] = useState<AdminUsersStatus>("all");

  const [customerStatus, setCustomerStatus] = useState<AdminUsersStatus>("all");

  const [customersLoaded, setCustomersLoaded] = useState(false);

  const [staffLoading, setStaffLoading] = useState(true);

  const [customersLoading, setCustomersLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<UsersTab>("staff");

  const isEditing = editingUserId !== null;

  useEffect(() => {
    void loadStaffUsers(1);
  }, []);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

  async function loadStaffUsers(page = staffPage) {
    try {
      setStaffLoading(true);
      setError(null);

      const data = await getAdminUsers({
        group: "staff",
        page,
        pageSize,
        search: staffSearch.trim() || undefined,
        status: staffStatus,
      });

      setStaffResult(data);
      setStaffPage(data.page);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setStaffLoading(false);
    }
  }

  async function loadCustomerUsers(page = customerPage) {
    try {
      setCustomersLoading(true);
      setError(null);

      const data = await getAdminUsers({
        group: "customers",
        page,
        pageSize,
        search: customerSearch.trim() || undefined,
        status: customerStatus,
      });

      setCustomersResult(data);
      setCustomerPage(data.page);
      setCustomersLoaded(true);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setCustomersLoading(false);
    }
  }

  async function reloadVisibleTables() {
    await loadStaffUsers(staffPage);

    if (customersLoaded) {
      await loadCustomerUsers(customerPage);
    }
  }

  function clearForm() {
    setForm(emptyForm);
    setEditingUserId(null);
  }

  function resetForm() {
    clearForm();

    setError(null);
    setSuccessMessage(null);
  }

  function scrollToEditor() {
    const editor = document.getElementById("admin-user-editor");

    if (!editor) {
      return;
    }

    editor.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    editor.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function startNewUser() {
    resetForm();

    window.setTimeout(scrollToEditor, 0);
  }

  function startEdit(user: AdminUserDto) {
    setEditingUserId(user.id);

    setForm({
      userName: user.userName,
      email: user.email,
      password: "",
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      roles: user.roles,
    });

    setError(null);
    setSuccessMessage(null);

    window.setTimeout(scrollToEditor, 0);
  }

  function toggleRole(role: AppRole) {
    setForm((current) => {
      const alreadySelected = current.roles.includes(role);

      if (alreadySelected) {
        return {
          ...current,
          roles: current.roles.filter((item) => item !== role),
        };
      }

      return {
        ...current,
        roles: [...current.roles, role],
      };
    });
  }

  function validateForm() {
    if (!form.userName.trim()) {
      return "Korisničko ime je obavezno.";
    }

    if (!form.email.trim()) {
      return "Email je obavezan.";
    }

    if (!form.firstName.trim()) {
      return "Ime je obavezno.";
    }

    if (!form.lastName.trim()) {
      return "Prezime je obavezno.";
    }

    if (!isEditing && !form.password.trim()) {
      return "Lozinka je obavezna za novog korisnika.";
    }

    if (!isEditing && form.password.length < 8) {
      return "Lozinka mora imati najmanje 8 karaktera.";
    }

    if (form.roles.length === 0) {
      return "Korisnik mora imati bar jednu rolu.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const wasEditing = editingUserId !== null;

    try {
      setSaving(true);

      setError(null);
      setSuccessMessage(null);

      if (editingUserId !== null) {
        await updateUserByAdmin(editingUserId, {
          userName: form.userName.trim(),
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        });

        await updateUserRoles(editingUserId, {
          roles: form.roles,
        });
      } else {
        await createUserByAdmin({
          userName: form.userName.trim(),
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          roles: form.roles,
        });
      }

      clearForm();

      await reloadVisibleTables();

      setSuccessMessage(
        wasEditing
          ? "Korisnik je uspešno izmenjen."
          : "Korisnik je uspešno kreiran.",
      );
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function showActionError(message: string) {
    setError(message);
    setSuccessMessage(null);

    await showAlert({
      title: "Radnja nije dozvoljena",
      message: <p>{message}</p>,
      confirmText: "U redu",
    });
  }

  async function handleAnonymize(user: AdminUserDto) {
    if (currentUserId === user.id) {
      await showActionError("Ne možete anonimizovati sopstveni nalog.");

      return;
    }

    if (user.isAnonymized) {
      await showActionError("Korisnik je već anonimizovan.");

      return;
    }

    if (!user.isBlocked) {
      await showActionError("Korisnik mora biti blokiran pre anonimizacije.");

      return;
    }

    const confirmed = await confirm({
      title: "Anonimizacija korisnika",
      message: (
        <>
          <p>
            Da li želite da anonimizujete korisnika{" "}
            <strong>„{user.userName}“</strong>?
          </p>

          <p>
            Lični podaci korisnika biće zamenjeni anonimnim podacima. Ovu radnju
            koristite samo kada za to postoji razlog.
          </p>
        </>
      ),
      confirmText: "Anonimizuj",
      cancelText: "Odustani",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      setActionLoadingId(user.id);

      await anonymizeUser(user.id);

      if (editingUserId === user.id) {
        clearForm();
      }

      await reloadVisibleTables();

      setSuccessMessage(`Korisnik „${user.userName}“ je anonimizovan.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleBlock(user: AdminUserDto) {
    if (currentUserId === user.id) {
      await showActionError("Ne možete blokirati sopstveni nalog.");

      return;
    }

    if (user.isAnonymized) {
      await showActionError("Anonimizovan korisnik ne može biti blokiran.");

      return;
    }

    if (user.isBlocked) {
      await showActionError("Korisnik je već blokiran.");

      return;
    }

    const confirmed = await confirm({
      title: "Blokiranje korisnika",
      message: (
        <p>
          Da li želite da blokirate korisnika <strong>„{user.userName}“</strong>
          ? Nakon blokiranja neće moći normalno da koristi nalog.
        </p>
      ),
      confirmText: "Blokiraj",
      cancelText: "Odustani",
      tone: "danger",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      setActionLoadingId(user.id);

      await blockUser(user.id);

      await reloadVisibleTables();

      setSuccessMessage(`Korisnik „${user.userName}“ je blokiran.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleUnblock(user: AdminUserDto) {
    const confirmed = await confirm({
      title: "Odblokiranje korisnika",
      message: (
        <p>
          Da li želite da odblokirate korisnika{" "}
          <strong>„{user.userName}“</strong>? Korisnik će ponovo moći da koristi
          svoj nalog.
        </p>
      ),
      confirmText: "Odblokiraj",
      cancelText: "Odustani",
      tone: "success",
    });

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);

      setActionLoadingId(user.id);

      await unblockUser(user.id);

      await reloadVisibleTables();

      setSuccessMessage(`Korisnik „${user.userName}“ je odblokiran.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleTabChange(tab: UsersTab) {
    setActiveTab(tab);

    setError(null);
    setSuccessMessage(null);

    if (tab === "customers" && !customersLoaded) {
      await loadCustomerUsers(1);
    }
  }

  const staffTotal = staffResult?.totalCount ?? 0;

  const customerTotal = customersLoaded
    ? (customersResult?.totalCount ?? 0)
    : null;

  const currentResult = activeTab === "staff" ? staffResult : customersResult;

  const currentPage = activeTab === "staff" ? staffPage : customerPage;

  const currentLoading =
    activeTab === "staff" ? staffLoading : customersLoading;

  const currentGroupLabel = activeTab === "staff" ? "Interni nalozi" : "Kupci";

  return (
    <main className="admin-users-page">
      <section className="admin-users-hero">
        <div className="admin-users-hero__content">
          <span className="admin-users-hero__eyebrow">
            BEEF N&apos; CHICKEN • ADMIN
          </span>

          <h1 className="admin-users-hero__title">Korisnici</h1>

          <p className="admin-users-hero__description">
            Kreirajte naloge zaposlenih, upravljajte rolama i kontrolišite
            status naloga zaposlenih i kupaca iz jednog centralnog panela.
          </p>

          <div className="admin-users-hero__meta">
            <span className="admin-users-hero__status">
              <span aria-hidden="true" />
              {staffTotal} internih naloga
            </span>

            <span className="admin-users-hero__customers">
              {customerTotal === null
                ? "Kupci se učitavaju po potrebi"
                : `${customerTotal} kupaca`}
            </span>
          </div>
        </div>

        <aside className="admin-users-summary">
          <header className="admin-users-summary__header">
            <span className="admin-users-summary__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle
                  cx="9"
                  cy="8"
                  r="3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />

                <path
                  d="M3.5 19c.4-3.1 2.3-5 5.5-5s5.1 1.9 5.5 5M16 8.5a2.5 2.5 0 1 1 0 5M16.5 14c2.5.2 3.8 1.8 4 4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>

            <span className="admin-users-summary__label">NALOZI</span>
          </header>

          <div className="admin-users-summary__value">
            <strong>{currentResult?.totalCount ?? 0}</strong>

            <span>{currentGroupLabel.toLowerCase()}</span>
          </div>

          <footer className="admin-users-summary__footer">
            <div>
              <span>Aktivni pregled</span>

              <strong>{currentGroupLabel}</strong>
            </div>

            <div>
              <span>Stranica</span>

              <strong>{currentPage}</strong>
            </div>

            <button
              type="button"
              className="admin-users-summary__new"
              onClick={startNewUser}
              aria-label="Kreiraj novog korisnika"
            >
              +
            </button>
          </footer>
        </aside>
      </section>

      <div className="admin-users-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-user-alert admin-user-alert--success">
            <span className="admin-user-alert__icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <strong>Promena je sačuvana</strong>

              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div
            className="admin-user-alert admin-user-alert--error"
            role="alert"
          >
            <span className="admin-user-alert__icon" aria-hidden="true">
              !
            </span>

            <div>
              <strong>Proverite radnju</strong>

              <p>{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="admin-users-layout">
        <aside
          id="admin-user-editor"
          className={[
            "admin-user-editor",
            isEditing ? "admin-user-editor--editing" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="admin-user-editor__intro">
            <div>
              <span className="admin-user-editor__eyebrow">
                {isEditing ? "IZMENA NALOGA" : "NOVI KORISNIK"}
              </span>

              <h2 className="admin-user-editor__title">
                {isEditing ? "Izmeni korisnika" : "Kreiraj korisnika"}
              </h2>

              <p>
                {isEditing
                  ? "Promenite podatke ili role izabranog korisnika."
                  : "Kreirajte novi nalog i odmah mu dodelite odgovarajuće role."}
              </p>
            </div>

            <span
              className={[
                "admin-user-editor__mode",
                isEditing ? "admin-user-editor__mode--editing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {isEditing ? `ID ${editingUserId}` : "Kreiranje"}
            </span>
          </div>

          <AdminUserForm
            form={form}
            isEditing={isEditing}
            saving={saving}
            onChange={setForm}
            onToggleRole={toggleRole}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
        </aside>

        <section className="admin-users-panel">
          <header className="admin-users-panel__header">
            <div>
              <span className="admin-users-panel__eyebrow">
                UPRAVLJANJE NALOZIMA
              </span>

              <h2 className="admin-users-panel__title">
                {activeTab === "staff" ? "Zaposleni i administratori" : "Kupci"}
              </h2>

              <p className="admin-users-panel__description">
                {activeTab === "staff"
                  ? "Upravljajte internim nalozima, rolama i pristupom administraciji."
                  : "Pronađite kupce i upravljajte statusom njihovih naloga."}
              </p>
            </div>

            <div className="admin-users-panel__count">
              <strong>{currentResult?.totalCount ?? 0}</strong>

              <span>naloga</span>
            </div>
          </header>

          <div
            className="admin-users-tabs"
            role="tablist"
            aria-label="Grupa korisnika"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "staff"}
              className={[
                "admin-users-tabs__button",
                activeTab === "staff" ? "admin-users-tabs__button--active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => void handleTabChange("staff")}
            >
              <span className="admin-users-tabs__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="9"
                    cy="8"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="M3.5 19c.4-3.1 2.3-5 5.5-5s5.1 1.9 5.5 5M17 7v6m-3-3h6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <span className="admin-users-tabs__content">
                <strong>Zaposleni i administratori</strong>

                <small>Interni pristup sistemu</small>
              </span>

              <span className="admin-users-tabs__count">{staffTotal}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "customers"}
              className={[
                "admin-users-tabs__button",
                activeTab === "customers"
                  ? "admin-users-tabs__button--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => void handleTabChange("customers")}
            >
              <span className="admin-users-tabs__icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle
                    cx="12"
                    cy="8"
                    r="3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="M5 19c.5-3.4 2.8-5.2 7-5.2s6.5 1.8 7 5.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>

              <span className="admin-users-tabs__content">
                <strong>Kupci</strong>

                <small>Korisnički nalozi</small>
              </span>

              <span className="admin-users-tabs__count">
                {customerTotal ?? "—"}
              </span>
            </button>
          </div>

          {activeTab === "staff" ? (
            <>
              <AdminUsersFilters
                search={staffSearch}
                status={staffStatus}
                placeholder="Ime, email ili korisničko ime..."
                onSearchChange={setStaffSearch}
                onStatusChange={setStaffStatus}
                onSubmit={() => loadStaffUsers(1)}
              />

              {staffLoading ? (
                <div className="admin-users-loading">
                  <span
                    className="admin-users-loading__spinner"
                    aria-hidden="true"
                  />

                  <div>
                    <strong>Učitavamo interne naloge</strong>

                    <p>Sačekajte trenutak.</p>
                  </div>
                </div>
              ) : staffResult ? (
                staffResult.items.length > 0 ? (
                  <>
                    <AdminUsersTable
                      users={staffResult.items}
                      currentUserId={currentUserId}
                      actionLoadingId={actionLoadingId}
                      onEdit={startEdit}
                      onBlock={handleBlock}
                      onUnblock={handleUnblock}
                      onAnonymize={handleAnonymize}
                    />

                    <PaginationControls
                      page={staffResult.page}
                      totalPages={staffResult.totalPages}
                      totalCount={staffResult.totalCount}
                      onPageChange={loadStaffUsers}
                    />
                  </>
                ) : (
                  <div className="admin-users-empty">
                    <span className="admin-users-empty__icon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle
                          cx="10"
                          cy="8"
                          r="3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />

                        <path
                          d="M4 19c.5-3.3 2.5-5 6-5 2.1 0 3.7.6 4.7 1.8M17 13l4 4m0-4-4 4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>

                    <strong>Nema pronađenih naloga</strong>

                    <p>Promenite pretragu ili status filter.</p>
                  </div>
                )
              ) : null}
            </>
          ) : (
            <>
              <AdminUsersFilters
                search={customerSearch}
                status={customerStatus}
                placeholder="Ime, email ili korisničko ime..."
                onSearchChange={setCustomerSearch}
                onStatusChange={setCustomerStatus}
                onSubmit={() => loadCustomerUsers(1)}
              />

              {customersLoading ? (
                <div className="admin-users-loading">
                  <span
                    className="admin-users-loading__spinner"
                    aria-hidden="true"
                  />

                  <div>
                    <strong>Učitavamo kupce</strong>

                    <p>Sačekajte trenutak.</p>
                  </div>
                </div>
              ) : customersResult ? (
                customersResult.items.length > 0 ? (
                  <>
                    <AdminUsersTable
                      users={customersResult.items}
                      currentUserId={currentUserId}
                      actionLoadingId={actionLoadingId}
                      onEdit={startEdit}
                      onBlock={handleBlock}
                      onUnblock={handleUnblock}
                      onAnonymize={handleAnonymize}
                    />

                    <PaginationControls
                      page={customersResult.page}
                      totalPages={customersResult.totalPages}
                      totalCount={customersResult.totalCount}
                      onPageChange={loadCustomerUsers}
                    />
                  </>
                ) : (
                  <div className="admin-users-empty">
                    <span className="admin-users-empty__icon">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle
                          cx="10"
                          cy="8"
                          r="3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />

                        <path
                          d="M4 19c.5-3.3 2.5-5 6-5 2.1 0 3.7.6 4.7 1.8M17 13l4 4m0-4-4 4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>

                    <strong>Nema pronađenih kupaca</strong>

                    <p>Promenite pretragu ili status filter.</p>
                  </div>
                )
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
