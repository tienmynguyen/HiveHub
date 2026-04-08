// helpers/validators.js

export const emailValidator = (email) => {
    const re = /\S+@\S+\.\S+/;
    if (!email || email.length <= 0) return "Email can't be empty.";
    if (!re.test(email)) return 'Ooops! We need a valid email address.';
    return '';
};

export const passwordValidator = (password) => {
    if (!password || password.length <= 0) return "Password can't be empty.";
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    return '';
};

export const nameValidator = (name) => {
    if (!name || name.length <= 0) return "Name can't be empty.";
    return '';
};

export  const textValidator = (text) =>{
    if (!text || text.length <= 0) return "Can't be empty.";
    return '';
}
