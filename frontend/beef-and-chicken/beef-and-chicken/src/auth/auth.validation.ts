export type LoginFormValues = {
  username: string;
  password: string;
};

export type RegisterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
};

export type FormErrors<T extends string = string> = Partial<Record<T, string>>;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hasUppercase(value: string) {
  return /[A-Z]/.test(value);
}

function hasLowercase(value: string) {
  return /[a-z]/.test(value);
}

function hasDigit(value: string) {
  return /\d/.test(value);
}

function hasSpecialChar(value: string) {
  return /[^A-Za-z0-9]/.test(value);
}

export function validateLogin(values: LoginFormValues) {
  const errors: FormErrors<keyof LoginFormValues> = {};

  if (!values.username.trim()) {
    errors.username = "Korisničko ime je obavezno.";
  }

  if (!values.password.trim()) {
    errors.password = "Lozinka je obavezna.";
  }

  return errors;
}

export function validateRegister(values: RegisterFormValues) {
  const errors: FormErrors<keyof RegisterFormValues> = {};

  if (!values.firstName.trim()) {
    errors.firstName = "Ime je obavezno.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Prezime je obavezno.";
  }

  if (!values.email.trim()) {
    errors.email = "Email je obavezan.";
  }

  if (!values.username.trim()) {
    errors.username = "Korisničko ime je obavezno.";
  }

  if (!values.password.trim()) {
    errors.password = "Lozinka je obavezna";
  } else {
    if (values.password.length < 8) {
      errors.password = "Lozinka mora imati najmanje 8 karaktera";
    } else if (!hasUppercase(values.password)) {
      errors.password = "Lozinka mora imati bar jedno veliko slovo.";
    } else if (!hasLowercase(values.password)) {
      errors.password = "Lozinka mora imati bar jedno malo slovo.";
    } else if (!hasDigit(values.password)) {
      errors.password = "Lozinka mora imati bar jedan broj.";
    } else if (!hasSpecialChar(values.password)) {
      errors.password = "Lozinka mora imati bar jedan specijalni znak.";
    }
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Potvrda lozinke je obavezna.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Lozinke se ne poklapaju.";
  }

  return errors;
}
