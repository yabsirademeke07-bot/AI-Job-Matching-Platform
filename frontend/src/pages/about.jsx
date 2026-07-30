import React from 'react';

function About() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">About AI JobMatch</h1>
            <p className="text-slate-600 text-lg leading-relaxed mb-6">
                AI JobMatch is an asynchronous web-based job matching platform designed to bridge the gap between skilled software developers and prospective employers.
            </p>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Our Core Mission</h2>
                <p className="text-slate-600">
                    Traditional recruitment often relies on manual resume screening, leading to delays and mismatched expectations. By leveraging intelligent skill algorithms, we automate candidate recommendation and streamline early recruitment stages.
                </p>
            </div>
        </div>
    );
}

export default About;