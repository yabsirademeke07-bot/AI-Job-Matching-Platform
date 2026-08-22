import React, { useState, useEffect } from 'react';
import api from '../services/api';

function AdminDashboard() {
    const [currentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user')) || null;
        } catch {
            return null;
        }
    });
    const [users, setUsers] = useState([]);
    const [pendingJobs, setPendingJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadAdminData = async () => {
            try {
                const { data } = await api.get('/admin/overview');
                setUsers(data.users || []);
                setPendingJobs(data.pendingJobs || []);
            } catch (loadError) {
                setError(loadError.response?.data?.message || 'Unable to load admin data.');
            } finally {
                setLoading(false);
            }
        };
        loadAdminData();
    }, []);

    const isAdmin = currentUser?.role === 'admin';

    const toggleUserStatus = async (id) => {
        try {
            await api.patch(`/admin/users/${id}/status`);
            setUsers((currentUsers) => currentUsers.map((user) => user.id === id ? { ...user, status: user.status === 'Active' ? 'Suspended' : 'Active' } : user));
        } catch (actionError) {
            setError(actionError.response?.data?.message || 'Unable to update user status.');
        }
    };

    const handleJobAction = async (id, newStatus) => {
        try {
            await api.patch(`/admin/jobs/${id}/status`, { status: newStatus });
            setPendingJobs((jobs) => jobs.filter((job) => job.id !== id));
        } catch (actionError) {
            setError(actionError.response?.data?.message || 'Unable to update job status.');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Admin Console</h1>
                    <p className="text-slate-500 text-sm">
                        Logged in as: <span className="font-semibold text-slate-700">{currentUser?.email}</span>
                    </p>
                </div>

                {/* Role Badge Status */}
                {isAdmin ? (
                    <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1.5 rounded-full border border-purple-200 shadow-sm flex items-center gap-1">
                        👑 Main Super Admin (Owner)
                    </span>
                ) : (
                    <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200">
                        🛡️ Sub-Admin (Restricted)
                    </span>
                )}
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Total Users</p>
                    <p className="text-3xl font-extrabold text-slate-900">{users.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Pending Job Approvals</p>
                    <p className="text-3xl font-extrabold text-amber-600">{pendingJobs.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-semibold text-slate-500 mb-1">Platform Status</p>
                    <p className="text-3xl font-extrabold text-emerald-600">Healthy</p>
                </div>
            </div>

            {/* Pending Job Approvals Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-8 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Pending Job Post Approvals</h2>
                {loading ? (
                    <p className="text-slate-500 text-sm">Loading admin data...</p>
                ) : error ? (
                    <p className="text-red-600 text-sm">{error}</p>
                ) : pendingJobs.length === 0 ? (
                    <p className="text-slate-500 text-sm">No pending jobs requiring review.</p>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {pendingJobs.map(job => (
                            <div key={job.id} className="py-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-slate-800">{job.title}</h3>
                                    <p className="text-xs text-slate-500">Posted by: {job.company}</p>
                                </div>

                                {/* Action Buttons - Restricted by Super Admin Role */}
                                <div className="flex gap-2">
                                    {isAdmin ? (
                                        <>
                                            <button 
                                                onClick={() => handleJobAction(job.id, 'Approved')}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => handleJobAction(job.id, 'Rejected')}
                                                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-xs text-slate-400 font-medium italic bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                            🔒 Approval Restricted to Owner
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Registered Users Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Registered Users</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="p-3">Name</th>
                                <th className="p-3">Email</th>
                                <th className="p-3">Role</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="p-3 font-medium text-slate-900">{u.name}</td>
                                    <td className="p-3">{u.email}</td>
                                    <td className="p-3 capitalize">{u.role.replace('_', ' ')}</td>
                                    <td className="p-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            u.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {u.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        {isAdmin ? (
                                            <button
                                                onClick={() => toggleUserStatus(u.id)}
                                                className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                                            >
                                                {u.status === 'Active' ? 'Suspend' : 'Activate'}
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">
                                                🔒 Restricted
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;