import React, { useState, useEffect } from 'react';

function AdminDashboard() {
    // 1. ከ LocalStorage ወይም Auth State የገባውን ተጠቃሚ መረጃ መውሰድ
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // በ Login ወቅት የተቀመጠውን user detail ያነባል
        const savedUser = JSON.parse(localStorage.getItem('user')) || {
            email: 'tekebaaweke32@gmail.com', // ለቴስት የሚሆን default value
            role: 'super_admin',
            is_super_admin: 1
        };
        setCurrentUser(savedUser);
    }, []);

    // 2. ተጠቃሚው Super Admin (ዋናው ባለቤት) መሆኑን ማረጋገጫ
    const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.is_super_admin === 1;

    const [users, setUsers] = useState([
        { id: 1, name: 'Abebe Bikila', email: 'abebe@gmail.com', role: 'job_seeker', status: 'Active' },
        { id: 2, name: 'Tech Ethiopia PLC', email: 'hr@tech.et', role: 'employer', status: 'Active' },
        { id: 3, name: 'John Doe', email: 'john@yahoo.com', role: 'job_seeker', status: 'Pending' },
    ]);

    const [pendingJobs, setPendingJobs] = useState([
        { id: 101, title: 'Senior React Developer', company: 'Tech Ethiopia PLC', status: 'Pending Review' },
        { id: 102, title: 'Python Data Scientist', company: 'AI Solutions Ltd', status: 'Pending Review' },
    ]);

    const toggleUserStatus = (id) => {
        // Super Admin ካልሆነ ይከለክላል
        if (!isSuperAdmin) {
            alert("⛔ Access Denied: Only the Main Super Admin can suspend/activate users!");
            return;
        }

        setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' } : u));
    };

    const handleJobAction = (id, newStatus) => {
        // Super Admin ካልሆነ የ Job approval ስራውን ይከለክላል
        if (!isSuperAdmin) {
            alert("⛔ Access Denied: Only the Main Super Admin (Tekeba) can approve or reject jobs!");
            return;
        }

        setPendingJobs(pendingJobs.filter(job => job.id !== id));
        alert(`Job post has been ${newStatus.toLowerCase()}!`);
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
                {isSuperAdmin ? (
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
                {pendingJobs.length === 0 ? (
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
                                    {isSuperAdmin ? (
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
                                        {isSuperAdmin ? (
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