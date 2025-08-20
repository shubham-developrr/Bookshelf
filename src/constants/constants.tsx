import React from 'react';

export const READER_TEXT = `
<h2 class="text-xl font-semibold mb-4 theme-text">Chapter Overview</h2>
<p class="mb-6" style="line-height: 1.8; font-size: 15px; text-align: justify; font-family: Georgia, serif;">Nature has endowed the human eye (retina) with the sensitivity to detect electromagnetic waves within a small range of the electromagnetic spectrum. Electromagnetic radiation belonging to this region of the spectrum (wavelength of about 400 nm to 750 nm) is called light. It is mainly through light and the sense of vision that we know and interpret the world around us. The study of optics has fascinated scientists for centuries, leading to breakthrough discoveries that have shaped our understanding of the physical world.</p>

<p class="mb-6" style="line-height: 1.8; font-size: 15px; text-align: justify; font-family: Georgia, serif;">There are two things that we can intuitively mention about light from common experience. First, that it travels with enormous speed and second, that it travels in a straight line. It took some time for people to realise that the speed of light is finite and measurable. Its presently accepted value in vacuum is c = 2.99792458 × 10⁸ m s⁻¹. For many purposes, it suffices to take c = 3 × 10⁸ m s⁻¹. The speed of light in vacuum is the highest speed attainable in nature, serving as a fundamental constant that governs the behavior of electromagnetic radiation across the universe.</p>

<p class="mb-6" style="line-height: 1.8; font-size: 15px; text-align: justify; font-family: Georgia, serif;">The intuitive notion that light travels in a straight line seems to contradict what we have learnt about electromagnetic waves and their wavelike properties. How do we reconcile these seemingly opposing concepts? The answer lies in understanding the scale at which we observe optical phenomena. The wavelength of light is extremely small compared to the size of ordinary objects that we encounter in our daily lives. In this situation, a light wave can be effectively considered to be travelling from one point to another along a straight line path.</p>

<p class="mb-6" style="line-height: 1.8; font-size: 15px; text-align: justify; font-family: Georgia, serif;">When studying geometric optics, we adopt the ray model of light propagation. A light wave can be considered to travel from one point to another along a straight line joining them. This straight-line path is called a ray of light, and a collection of such rays constitutes a beam of light. This simplified model allows us to analyze complex optical phenomena including reflection, refraction, and dispersion using straightforward geometric principles. The ray approximation is particularly useful when dealing with mirrors, lenses, and other optical instruments where the dimensions are much larger than the wavelength of light.</p>

<p class="mb-6" style="line-height: 1.8; font-size: 15px; text-align: justify; font-family: Georgia, serif;">Using the fundamental laws of reflection and refraction, we can systematically study how images are formed by various optical elements. Plane mirrors create virtual images that appear to be the same distance behind the mirror as the object is in front of it. Curved mirrors and lenses, whether concave or convex, follow predictable patterns that can be analyzed using mathematical relationships. These principles form the foundation for understanding telescopes, microscopes, cameras, and the human eye itself.</p>

<p class="mb-6" style="line-height: 1.8; font-size: 15px; text-align: justify; font-family: Georgia, serif;">The study of optics extends far beyond simple ray tracing. Modern applications include fiber optic communications, laser technology, holography, and advanced imaging systems. Understanding the fundamental principles of light behavior enables us to design sophisticated optical devices and systems that have revolutionized telecommunications, medicine, manufacturing, and scientific research. From the simple magnifying glass to complex interferometers used in gravitational wave detection, optics continues to push the boundaries of what is technologically possible.</p>

<h3 class="text-lg font-semibold mb-3 mt-8 theme-text">Key Learning Objectives</h3>
<ul class="mb-6 ml-6 list-disc" style="line-height: 1.8; font-size: 15px; font-family: Georgia, serif;">
    <li class="mb-2">Understand the dual nature of light and when to apply the ray model</li>
    <li class="mb-2">Master the laws of reflection and refraction</li>
    <li class="mb-2">Analyze image formation by plane and curved mirrors</li>
    <li class="mb-2">Study refraction through lenses and optical instruments</li>
    <li class="mb-2">Explore applications in modern optical technologies</li>
</ul>

<p class="mb-6" style="line-height: 1.8; font-size: 15px; text-align: justify; font-family: Georgia, serif;">This chapter provides the essential foundation for understanding how light interacts with matter and how we can manipulate these interactions to create useful optical devices. The principles you learn here will be applied throughout your study of physics and will provide insights into phenomena ranging from rainbows and mirages to the operation of sophisticated scientific instruments.</p>
`;

export const syllabus = {};

export const chapterSubtopics = {};

// Dynamic function to get syllabus including imported books
export const getSyllabus = () => {
  const baseSyllabus = { ...syllabus };
  
  // Add imported books
  try {
    const importedBooks = JSON.parse(localStorage.getItem('importedBooks') || '[]');
    importedBooks.forEach((book: any) => {
      if (book.chapters && Array.isArray(book.chapters)) {
        baseSyllabus[book.name] = book.chapters;
      }
    });
  } catch (error) {
    console.warn('Failed to load imported books:', error);
  }
  
  return baseSyllabus;
};

// Dynamic function to get chapter subtopics including imported books
export const getChapterSubtopics = () => {
  const baseSubtopics = { ...chapterSubtopics };
  
  // Add imported book subtopics
  try {
    const importedSubtopics = JSON.parse(localStorage.getItem('importedChapterSubtopics') || '{}');
    Object.assign(baseSubtopics, importedSubtopics);
  } catch (error) {
    console.warn('Failed to load imported chapter subtopics:', error);
  }
  
  return baseSubtopics;
};

