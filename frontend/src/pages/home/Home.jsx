import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import HeroSection from '../../components/home/HeroSection';
import InteractiveAiDemo from '../../components/home/InteractiveAiDemo';
import FeaturedJobs from '../../components/home/FeaturedJobs';
import DualPathCards from '../../components/home/DualPathCards';
import Testimonials from '../../components/home/Testimonials';
import FaqAccordion from '../../components/home/FaqAccordion';

import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [searchTitle, setSearchTitle] = useState('');
  const [category, setCategory] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const query = new URLSearchParams({ search: searchTitle, category }).toString();
    navigate(`/jobs?${query}`);
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">
      <HeroSection
        searchTitle={searchTitle}
        setSearchTitle={setSearchTitle}
        category={category}
        setCategory={setCategory}
        handleSearch={handleSearch}
      />
      <InteractiveAiDemo />
      <FeaturedJobs />
      <DualPathCards />
      <Testimonials />
      <FaqAccordion />
    </div>
  );
}