import { User } from '@/types';

// Admin user + 22 pre-defined users with unique logins and passwords
const initialUsers: User[] = [
  // Admin user
  { id: 0, username: 'admin', password: 'Admin@2026#Secure', name: 'Administrator', isAdmin: true },
  // Regular users
  { id: 1, username: 'talaba01', password: 'T@l@ba2026#01', name: 'Talaba 1', isAdmin: false },
  { id: 2, username: 'talaba02', password: 'T@l@ba2026#02', name: 'Talaba 2', isAdmin: false },
  { id: 3, username: 'talaba03', password: 'T@l@ba2026#03', name: 'Talaba 3', isAdmin: false },
  { id: 4, username: 'talaba04', password: 'T@l@ba2026#04', name: 'Talaba 4', isAdmin: false },
  { id: 5, username: 'talaba05', password: 'T@l@ba2026#05', name: 'Talaba 5', isAdmin: false },
  { id: 6, username: 'talaba06', password: 'T@l@ba2026#06', name: 'Talaba 6', isAdmin: false },
  { id: 7, username: 'talaba07', password: 'T@l@ba2026#07', name: 'Talaba 7', isAdmin: false },
  { id: 8, username: 'talaba08', password: 'T@l@ba2026#08', name: 'Talaba 8', isAdmin: false },
  { id: 9, username: 'talaba09', password: 'T@l@ba2026#09', name: 'Talaba 9', isAdmin: false },
  { id: 10, username: 'talaba10', password: 'T@l@ba2026#10', name: 'Talaba 10', isAdmin: false },
  { id: 11, username: 'talaba11', password: 'T@l@ba2026#11', name: 'Talaba 11', isAdmin: false },
  { id: 12, username: 'talaba12', password: 'T@l@ba2026#12', name: 'Talaba 12', isAdmin: false },
  { id: 13, username: 'talaba13', password: 'T@l@ba2026#13', name: 'Talaba 13', isAdmin: false },
  { id: 14, username: 'talaba14', password: 'T@l@ba2026#14', name: 'Talaba 14', isAdmin: false },
  { id: 15, username: 'talaba15', password: 'T@l@ba2026#15', name: 'Talaba 15', isAdmin: false },
  { id: 16, username: 'talaba16', password: 'T@l@ba2026#16', name: 'Talaba 16', isAdmin: false },
  { id: 17, username: 'talaba17', password: 'T@l@ba2026#17', name: 'Talaba 17', isAdmin: false },
  { id: 18, username: 'talaba18', password: 'T@l@ba2026#18', name: 'Talaba 18', isAdmin: false },
  { id: 19, username: 'talaba19', password: 'T@l@ba2026#19', name: 'Talaba 19', isAdmin: false },
  { id: 20, username: 'talaba20', password: 'T@l@ba2026#20', name: 'Talaba 20', isAdmin: false },
  { id: 21, username: 'talaba21', password: 'T@l@ba2026#21', name: 'Talaba 21', isAdmin: false },
  { id: 22, username: 'talaba22', password: 'T@l@ba2026#22', name: 'Talaba 22', isAdmin: false },
];

// Mutable users store for runtime updates
let runtimeUsers = [...initialUsers];

export const users = initialUsers;

export function getUsers(): User[] {
  return runtimeUsers.filter(u => !u.isAdmin);
}

export function getAllUsers(): User[] {
  return runtimeUsers;
}

export function authenticateUser(username: string, password: string): User | null {
  const user = runtimeUsers.find(
    (u) => u.username === username && u.password === password
  );
  return user || null;
}

export function getUserById(id: number): User | null {
  return runtimeUsers.find((u) => u.id === id) || null;
}

export function updateUser(id: number, updates: Partial<User>): User | null {
  const index = runtimeUsers.findIndex((u) => u.id === id);
  if (index === -1) return null;
  
  runtimeUsers[index] = { ...runtimeUsers[index], ...updates };
  return runtimeUsers[index];
}

export function createUser(user: Omit<User, 'id'>): User {
  const maxId = Math.max(...runtimeUsers.map(u => u.id));
  const newUser: User = {
    ...user,
    id: maxId + 1,
  };
  runtimeUsers.push(newUser);
  return newUser;
}

export function deleteUser(id: number): boolean {
  const index = runtimeUsers.findIndex((u) => u.id === id);
  if (index === -1 || runtimeUsers[index].isAdmin) return false;
  
  runtimeUsers.splice(index, 1);
  return true;
}

export function resetUsers(): void {
  runtimeUsers = [...initialUsers];
}
