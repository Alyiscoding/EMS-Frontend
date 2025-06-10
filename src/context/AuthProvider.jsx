import React, { createContext, useEffect, useState } from 'react';
import { BASE_URL } from '../../config';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState({ employees: [], admin: null, currentUser: null });
    const [loading, setLoading] = useState(true);

    // Fetch all users (employees and admin) from the backend
    const fetchUsers = async () => {
        try {
            const response = await fetch(`${BASE_URL}/users-tasks`);
            const data = await response.json();
            if (data.success) {
                const employees = data.data
                    .filter(item => item.user.role === 'employee')
                    .map(item => ({ ...item.user, tasks: item.tasks }));
                const adminItem = data.data.find(item => item.user.role === 'admin');
                const admin = adminItem ? { ...adminItem.user, tasks: adminItem.tasks } : null;
                setUserData(prev => ({ ...prev, employees, admin }));
            }
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    const loginUser = async (email, password) => {
        try {
            const response = await fetch(`${BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.success) {
                const usersRes = await fetch(`${BASE_URL}/users-tasks`);
                const usersData = await usersRes.json();
                if (usersData.success) {
                    const found = usersData.data.find(
                        item => item.user._id === data.user._id
                    );
                    if (found) {
                        const userWithTasks = { ...found.user, tasks: found.tasks };
                        setUserData(prev => ({ ...prev, currentUser: userWithTasks }));
                        localStorage.setItem('currentUser', JSON.stringify(userWithTasks));
                        return { success: true, user: userWithTasks };
                    }
                }
                setUserData(prev => ({ ...prev, currentUser: data.user }));
                localStorage.setItem('currentUser', JSON.stringify(data.user));
                return { success: true, user: data.user };
            }
            return { success: false, message: data.message };
        } catch (err) {
            return { success: false, message: 'Network error' };
        }
    };

    const logoutUser = () => {
        setUserData(prev => ({ ...prev, currentUser: null }));
        localStorage.removeItem('currentUser');
    };

    const addTask = async (taskData) => {
        try {
            const response = await fetch(`${BASE_URL}/add-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });
            const data = await response.json();
            if (data.success) {
                await fetchUsers();
                if (userData.currentUser) {
                    const usersRes = await fetch(`${BASE_URL}/users-tasks`);
                    const usersData = await usersRes.json();
                    if (usersData.success) {
                        const found = usersData.data.find(
                            item => item.user._id === userData.currentUser._id
                        );
                        if (found) {
                            const userWithTasks = { ...found.user, tasks: found.tasks };
                            setUserData(prev => ({ ...prev, currentUser: userWithTasks }));
                            localStorage.setItem('currentUser', JSON.stringify(userWithTasks));
                        }
                    }
                }
                return { success: true, task: data.task };
            }
            return { success: false, message: data.message };
        } catch (err) {
            return { success: false, message: 'Network error' };
        }
    };

    const updateTask = async (taskId, updates) => {
        try {
            const response = await fetch(`${BASE_URL}/update-task/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const data = await response.json();
            if (data.success) {
                await fetchUsers();
                if (userData.currentUser) {
                    const usersRes = await fetch(`${BASE_URL}/users-tasks`);
                    const usersData = await usersRes.json();
                    if (usersData.success) {
                        const found = usersData.data.find(
                            item => item.user._id === userData.currentUser._id
                        );
                        if (found) {
                            const userWithTasks = { ...found.user, tasks: found.tasks };
                            setUserData(prev => ({ ...prev, currentUser: userWithTasks }));
                            localStorage.setItem('currentUser', JSON.stringify(userWithTasks));
                        }
                    }
                }
                return { success: true, task: data.task };
            }
            return { success: false, message: data.message };
        } catch (err) {
            return { success: false, message: 'Network error' };
        }
    };

    useEffect(() => {
        const restoreUserWithTasks = async () => {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                const usersRes = await fetch(`${BASE_URL}/users-tasks`);
                const usersData = await usersRes.json();
                if (usersData.success) {
                    const found = usersData.data.find(
                        item => item.user._id === parsedUser._id
                    );
                    if (found) {
                        const userWithTasks = { ...found.user, tasks: found.tasks };
                        setUserData(prev => ({ ...prev, currentUser: userWithTasks }));
                        localStorage.setItem('currentUser', JSON.stringify(userWithTasks));
                        await fetchUsers();
                        return;
                    }
                }
                setUserData(prev => ({ ...prev, currentUser: parsedUser }));
            }
            await fetchUsers();
        };
        restoreUserWithTasks();
    }, []);

    return (
        <AuthContext.Provider value={{
            ...userData,
            loading,
            loginUser,
            logoutUser,
            addTask,
            updateTask,
            refreshUsers: fetchUsers
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
