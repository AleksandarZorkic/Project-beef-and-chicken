import { FormEvent, useEffect, useState } from "react";
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

const emptyForm: AdminUserFormState = {
  userName: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  roles: [AppRoles.Customer],
};

const pageSize = 10;

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

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isEditing = editingUserId !== null;

  useEffect(() => {
    loadStaffUsers(1);
  }, []);

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
    } catch (e) {
      setError(getApiErrorMessage(e));
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
    } catch (e) {
      setError(getApiErrorMessage(e));
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

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleRole(role: AppRole) {
    setForm((prev) => {
      const alreadySelected = prev.roles.includes(role);

      if (alreadySelected) {
        return {
          ...prev,
          roles: prev.roles.filter((item) => item !== role),
        };
      }

      return {
        ...prev,
        roles: [...prev.roles, role],
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (editingUserId) {
        await updateUserByAdmin(editingUserId, {
          userName: form.userName.trim(),
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        });

        await updateUserRoles(editingUserId, {
          roles: form.roles,
        });

        setSuccessMessage("Korisnik je uspešno izmenjen.");
      } else {
        await createUserByAdmin({
          userName: form.userName.trim(),
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          roles: form.roles,
        });

        setSuccessMessage("Korisnik je uspešno kreiran.");
      }

      clearForm();
      await reloadVisibleTables();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleAnonymize(user: AdminUserDto) {
    const loggedInUserId = currentUser?.id ? Number(currentUser.id) : null;

    if (loggedInUserId === user.id) {
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

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await anonymizeUser(user.id);
      await reloadVisibleTables();

      setSuccessMessage(`Korisnik "${user.userName}" je anonimizovan.`);
    } catch (e) {
      setError(getApiErrorMessage(e));
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

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await blockUser(user.id);
      await reloadVisibleTables();

      setSuccessMessage(`Korisnik "${user.userName}" je blokiran.`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  async function handleUnblock(user: AdminUserDto) {
    const confirmed = window.confirm(
      `Da li želiš da odblokiraš korisnika "${user.userName}"?`,
    );

    if (!confirmed) return;

    try {
      setError(null);
      setSuccessMessage(null);

      await unblockUser(user.id);
      await reloadVisibleTables();

      setSuccessMessage(`Korisnik "${user.userName}" je odblokiran.`);
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2>Admin korisnici</h2>

      <p style={{ color: "#555" }}>
        Ovde admin može da kreira korisnike, menja njihove podatke, dodeljuje
        role i blokira ili odblokira naloge.
      </p>

      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>
      )}

      {successMessage && (
        <div style={{ color: "green", marginBottom: 12 }}>{successMessage}</div>
      )}

      <AdminUserForm
        form={form}
        isEditing={isEditing}
        saving={saving}
        onChange={setForm}
        onToggleRole={toggleRole}
        onSubmit={handleSubmit}
        onCancel={resetForm}
      />

      <h3>Zaposleni i admin korisnici</h3>

      <AdminUsersFilters
        search={staffSearch}
        status={staffStatus}
        placeholder="Pretraži zaposlene..."
        onSearchChange={setStaffSearch}
        onStatusChange={setStaffStatus}
        onSubmit={() => loadStaffUsers(1)}
      />

      {staffLoading && <div>Učitavam zaposlene...</div>}

      {!staffLoading && staffResult && (
        <>
          <AdminUsersTable
            users={staffResult.items}
            currentUserId={currentUserId}
            onEdit={startEdit}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
            onAnonymize={handleAnonymize}
          />

          <PaginationControls
            page={staffResult.page}
            totalPages={staffResult.totalPages}
            totalCount={staffResult.totalCount}
            onPageChange={(page) => loadStaffUsers(page)}
          />
        </>
      )}

      <h3 style={{ marginTop: 32 }}>Customer korisnici</h3>

      {!customersLoaded && (
        <button type="button" onClick={() => loadCustomerUsers(1)}>
          Učitaj customer korisnike
        </button>
      )}

      {customersLoaded && (
        <>
          <AdminUsersFilters
            search={customerSearch}
            status={customerStatus}
            placeholder="Pretraži customer korisnike..."
            onSearchChange={setCustomerSearch}
            onStatusChange={setCustomerStatus}
            onSubmit={() => loadCustomerUsers(1)}
          />

          {customersLoading && <div>Učitavam customer korisnike...</div>}

          {!customersLoading && customersResult && (
            <>
              <AdminUsersTable
                users={customersResult.items}
                currentUserId={currentUserId}
                onEdit={startEdit}
                onBlock={handleBlock}
                onUnblock={handleUnblock}
                onAnonymize={handleAnonymize}
              />

              <PaginationControls
                page={customersResult.page}
                totalPages={customersResult.totalPages}
                totalCount={customersResult.totalCount}
                onPageChange={(page) => loadCustomerUsers(page)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
