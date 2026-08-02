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

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const message =
        editingUserId !== null
          ? "Korisnik je uspešno izmenjen."
          : "Korisnik je uspešno kreiran.";

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

      setSuccessMessage(message);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function handleAnonymize(user: AdminUserDto) {
    if (currentUserId === user.id) {
      const message = "Ne možeš anonimizovati sopstveni nalog.";

      setError(message);
      setSuccessMessage(null);
      window.alert(message);

      return;
    }

    if (user.isAnonymized) {
      const message = "Korisnik je već anonimizovan.";

      setError(message);
      setSuccessMessage(null);
      window.alert(message);

      return;
    }

    if (!user.isBlocked) {
      const message = "Korisnik mora biti blokiran pre anonimizacije.";

      setError(message);
      setSuccessMessage(null);
      window.alert(message);

      return;
    }

    const confirmed = window.confirm(
      `Da li sigurno želiš da anonimizuješ korisnika "${user.userName}"?\n\nOva akcija menja lične podatke korisnika i ne treba je koristiti bez razloga.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(user.id);

      await anonymizeUser(user.id);
      await reloadVisibleTables();

      setSuccessMessage(`Korisnik "${user.userName}" je anonimizovan.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleBlock(user: AdminUserDto) {
    if (currentUserId === user.id) {
      const message = "Ne možeš blokirati sopstveni nalog.";

      setError(message);
      setSuccessMessage(null);
      window.alert(message);

      return;
    }

    if (user.isAnonymized) {
      const message = "Anonimizovan korisnik ne može biti blokiran.";

      setError(message);
      setSuccessMessage(null);
      window.alert(message);

      return;
    }

    if (user.isBlocked) {
      const message = "Korisnik je već blokiran.";

      setError(message);
      setSuccessMessage(null);
      window.alert(message);

      return;
    }

    const confirmed = window.confirm(
      `Da li sigurno želiš da blokiraš korisnika "${user.userName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(user.id);

      await blockUser(user.id);
      await reloadVisibleTables();

      setSuccessMessage(`Korisnik "${user.userName}" je blokiran.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleUnblock(user: AdminUserDto) {
    const confirmed = window.confirm(
      `Da li želiš da odblokiraš korisnika "${user.userName}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      setSuccessMessage(null);
      setActionLoadingId(user.id);

      await unblockUser(user.id);
      await reloadVisibleTables();

      setSuccessMessage(`Korisnik "${user.userName}" je odblokiran.`);
    } catch (error) {
      setError(getApiErrorMessage(error));
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleTabChange(tab: UsersTab) {
    setActiveTab(tab);

    if (tab === "customers" && !customersLoaded) {
      await loadCustomerUsers(1);
    }
  }

  const staffTotal = staffResult?.totalCount ?? 0;

  const customerTotal = customersLoaded
    ? (customersResult?.totalCount ?? 0)
    : null;

  return (
    <main className="admin-users-page">
      <header className="admin-users-page__header">
        <div>
          <span className="admin-users-page__eyebrow">
            UPRAVLJANJE NALOZIMA
          </span>

          <h1 className="admin-users-page__title">Korisnici</h1>

          <p className="admin-users-page__description">
            Kreirajte korisnike, menjajte njihove podatke i role i upravljajte
            statusom korisničkih naloga.
          </p>
        </div>

        <button
          type="button"
          className="admin-users-page__new-button"
          onClick={startNewUser}
        >
          <span aria-hidden="true">+</span>
          Novi korisnik
        </button>
      </header>

      <div className="admin-users-page__messages" aria-live="polite">
        {successMessage && (
          <div className="admin-user-alert admin-user-alert--success">
            <span className="admin-user-alert__icon" aria-hidden="true">
              ✓
            </span>

            <div>
              <strong>Uspešno završeno</strong>
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
              <strong>Došlo je do greške</strong>
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
              <span className="admin-users-panel__eyebrow">PREGLED NALOGA</span>

              <h2 className="admin-users-panel__title">
                Upravljanje korisnicima
              </h2>
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
              Zaposleni i administratori
              <span>{staffTotal}</span>
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
              Kupci
              <span>{customerTotal ?? "—"}</span>
            </button>
          </div>

          {activeTab === "staff" ? (
            <>
              <AdminUsersFilters
                search={staffSearch}
                status={staffStatus}
                placeholder="Pretraži zaposlene..."
                onSearchChange={setStaffSearch}
                onStatusChange={setStaffStatus}
                onSubmit={() => loadStaffUsers(1)}
              />

              {staffLoading ? (
                <div className="admin-users-loading">Učitavam zaposlene...</div>
              ) : (
                staffResult && (
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
                )
              )}
            </>
          ) : (
            <>
              <AdminUsersFilters
                search={customerSearch}
                status={customerStatus}
                placeholder="Pretraži kupce..."
                onSearchChange={setCustomerSearch}
                onStatusChange={setCustomerStatus}
                onSubmit={() => loadCustomerUsers(1)}
              />

              {customersLoading ? (
                <div className="admin-users-loading">Učitavam kupce...</div>
              ) : (
                customersResult && (
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
                )
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
