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

export function getPasswordRules(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: hasUppercase(password),
    hasLowercase: hasLowercase(password),
    hasDigit: hasDigit(password),
    hasSpecialChar: hasSpecialChar(password),
  };
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
  } else if (values.firstName.trim().length < 2) {
    errors.firstName = "Ime mora imati najmanje 2 karaktera.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Prezime je obavezno.";
  } else if (values.lastName.trim().length < 2) {
    errors.lastName = "Prezime mora imati najmanje 2 karaktera.";
  }

  if (!values.email.trim()) {
    errors.email = "Email je obavezan.";
  } else if (!isValidEmail(values.email.trim())) {
    errors.email = "Unesi ispravan email, na primer: ime@gmail.com";
  }

  if (!values.username.trim()) {
    errors.username = "Korisničko ime je obavezno.";
  } else if (values.username.trim().length < 3) {
    errors.username = "Korisničko ime mora imati najmanje 3 karaktera.";
  }

  if (!values.password.trim()) {
    errors.password = "Lozinka je obavezna";
  } else {
    const passwordRules = getPasswordRules(values.password);
    const missingRules: string[] = [];

    if (!passwordRules.minLength) {
      missingRules.push("Lozinka mora imati najmanje 8 karaktera");
    }
    if (!passwordRules.hasUppercase) {
      missingRules.push("Lozinka mora imati bar jedno veliko slovo.");
    }
    if (!passwordRules.hasLowercase) {
      missingRules.push("Lozinka mora imati bar jedno malo slovo.");
    }
    if (!passwordRules.hasDigit) {
      missingRules.push("Lozinka mora imati bar jedan broj.");
    }
    if (!passwordRules.hasSpecialChar) {
      missingRules.push("Lozinka mora imati bar jedan specijalni znak.");
    }

    if (missingRules.length > 0) {
      errors.password = `Lozinka mora sadržati: ${missingRules.join(", ")}`;
    }
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Potvrda lozinke je obavezna.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Lozinke se ne poklapaju.";
  }

  return errors;
}
