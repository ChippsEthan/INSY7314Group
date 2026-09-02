const { v4: uuidv4 } = require('uuid');

// In-memory user store (replaced with MongoDB in Part 2)
const users = [];

const VALID_ROLES = ['client', 'freelancer', 'admin'];


//Creates a new user object (password must already be hashed before calling this).

function createUser({ username, email, password, role = 'client' }) {
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  const user = {
    id: uuidv4(),
    username: username.trim(),
    email: email.toLowerCase().trim(),
    password, // bcrypt hash
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  return user;
}


//Find a user by email (case-insensitive).
 
function findByEmail(email) {
  return users.find((u) => u.email === email.toLowerCase().trim()) || null;
}


//Find a user by ID.

function findById(id) {
  return users.find((u) => u.id === id) || null;
}


//Returns a safe user object (no password field).

function sanitiseUser(user) {
  const { password, ...safe } = user;
  return safe;
}

module.exports = { createUser, findByEmail, findById, sanitiseUser, VALID_ROLES };
