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

export const syllabus = {
  "Object Oriented System Design with C++": [
    "Introduction",
    "Basic Structural Modeling",
    "Object Oriented Analysis",
    "C++ Basics",
    "Objects and Classes",
  ],
  "Application of Soft Computing": [
    "Neural Networks-I (Introduction & Architecture)",
    "Neural Networks-II (Back propagation networks)",
    "Fuzzy Logic-I (Introduction)",
    "Fuzzy Logic-II (Fuzzy Membership, Rules)",
    "Genetic Algorithm(GA)",
  ],
  "Database Management System": [
    "Introduction",
    "Relational data Model and Language",
    "Data Base Design & Normalization",
    "Transaction Processing Concept",
    "Concurrency Control Techniques",
  ],
  "Web Technology": [
    "Introduction",
    "CSS",
    "Scripting",
    "Enterprise Java Bean",
    "Servlets",
  ],
  "Design and Analysis of Algorithm": [
    "Introduction",
    "Advanced Data Structures",
    "Divide and Conquer",
    "Greedy Methods",
    "Dynamic Programming",
  ],
  "Mechanics of Robots": [
    "Mathematical Preliminaries of Robotics",
    "Robot Kinematics",
    "Velocities & Statics",
    "Robot Dynamics",
    "Text Books/References",
  ],
};

export const chapterSubtopics = {
  "Object Oriented System Design with C++": {
    "Introduction": [
      "What is Object-Oriented Design?",
      "Benefits of OOD",
      "Object-Oriented vs Procedural Programming",
      "History of OOP",
      "UML Introduction"
    ],
    "Basic Structural Modeling": [
      "Classes and Objects",
      "Attributes and Operations",
      "Relationships",
      "Inheritance Hierarchies",
      "Packages and Modules"
    ],
    "Object Oriented Analysis": [
      "Requirements Analysis",
      "Use Case Modeling",
      "Domain Modeling",
      "System Architecture",
      "Analysis Patterns"
    ],
    "C++ Basics": [
      "Variables and Data Types",
      "Operators and Expressions",
      "Control Structures",
      "Functions and Scope",
      "Pointers and References"
    ],
    "Objects and Classes": [
      "Class Declaration",
      "Constructor and Destructor",
      "Access Specifiers",
      "Member Functions",
      "Static Members"
    ]
  },
  "Application of Soft Computing": {
    "Neural Networks-I (Introduction & Architecture)": [
      "Biological Neural Networks",
      "Artificial Neural Network Models",
      "Perceptron",
      "Multi-layer Networks",
      "Activation Functions"
    ],
    "Neural Networks-II (Back propagation networks)": [
      "Gradient Descent Algorithm",
      "Error Back-propagation",
      "Training Process",
      "Learning Rate",
      "Convergence Issues"
    ],
    "Fuzzy Logic-I (Introduction)": [
      "Classical vs Fuzzy Sets",
      "Fuzzy Set Theory",
      "Membership Functions",
      "Fuzzy Operations",
      "Linguistic Variables"
    ],
    "Fuzzy Logic-II (Fuzzy Membership, Rules)": [
      "Types of Membership Functions",
      "Fuzzy Rules",
      "Fuzzy Inference Systems",
      "Defuzzification Methods",
      "Applications"
    ],
    "Genetic Algorithm(GA)": [
      "Darwin's Theory of Evolution",
      "GA Components",
      "Selection Methods",
      "Crossover Operations",
      "Mutation and Applications"
    ]
  },
  "Database Management System": {
    "Introduction": [
      "What is Database?",
      "DBMS vs File System",
      "Database Architecture",
      "Data Independence",
      "Database Users"
    ],
    "Relational data Model and Language": [
      "Relational Model Concepts",
      "Keys and Constraints",
      "SQL Fundamentals",
      "DDL and DML",
      "Joins and Subqueries"
    ],
    "Data Base Design & Normalization": [
      "ER Model",
      "Functional Dependencies",
      "Normal Forms (1NF, 2NF, 3NF)",
      "BCNF",
      "Denormalization"
    ],
    "Transaction Processing Concept": [
      "ACID Properties",
      "Transaction States",
      "Serializability",
      "Recovery Mechanisms",
      "Deadlock Handling"
    ],
    "Concurrency Control Techniques": [
      "Lock-based Protocols",
      "Two-Phase Locking",
      "Timestamp Ordering",
      "Multiversion Concurrency",
      "Optimistic Concurrency"
    ]
  },
  "Web Technology": {
    "Introduction": [
      "History of Web",
      "Client-Server Architecture",
      "HTTP Protocol",
      "Web Standards",
      "Browser Technologies"
    ],
    "CSS": [
      "CSS Syntax",
      "Selectors and Properties",
      "Box Model",
      "Flexbox and Grid",
      "Responsive Design"
    ],
    "Scripting": [
      "JavaScript Fundamentals",
      "DOM Manipulation",
      "Event Handling",
      "AJAX and Fetch API",
      "ES6+ Features"
    ],
    "Enterprise Java Bean": [
      "EJB Architecture",
      "Session Beans",
      "Entity Beans",
      "Message-Driven Beans",
      "EJB Container"
    ],
    "Servlets": [
      "Servlet Lifecycle",
      "HTTP Methods",
      "Session Management",
      "Filters and Listeners",
      "Servlet Configuration"
    ]
  },
  "Design and Analysis of Algorithm": {
    "Introduction": [
      "Algorithm Definition",
      "Time and Space Complexity",
      "Big O Notation",
      "Best, Average, Worst Case",
      "Algorithm Analysis Techniques"
    ],
    "Advanced Data Structures": [
      "Heaps and Priority Queues",
      "Binary Search Trees",
      "AVL Trees",
      "B-Trees",
      "Hash Tables"
    ],
    "Divide and Conquer": [
      "Divide and Conquer Strategy",
      "Merge Sort",
      "Quick Sort",
      "Binary Search",
      "Master Theorem"
    ],
    "Greedy Methods": [
      "Greedy Algorithm Strategy",
      "Activity Selection Problem",
      "Fractional Knapsack",
      "Huffman Coding",
      "Minimum Spanning Tree"
    ],
    "Dynamic Programming": [
      "DP Principles",
      "Memoization vs Tabulation",
      "0/1 Knapsack Problem",
      "Longest Common Subsequence",
      "Matrix Chain Multiplication"
    ]
  },
  "Mechanics of Robots": {
    "Mathematical Preliminaries of Robotics": [
      "Vector and Matrix Operations",
      "Coordinate Systems",
      "Transformation Matrices",
      "Homogeneous Coordinates",
      "Rotation Representations"
    ],
    "Robot Kinematics": [
      "Forward Kinematics",
      "Inverse Kinematics",
      "Denavit-Hartenberg Parameters",
      "Joint Space and Cartesian Space",
      "Kinematic Chains"
    ],
    "Velocities & Statics": [
      "Linear and Angular Velocity",
      "Jacobian Matrix",
      "Velocity Propagation",
      "Static Force Analysis",
      "Workspace Analysis"
    ],
    "Robot Dynamics": [
      "Equations of Motion",
      "Lagrangian Formulation",
      "Newton-Euler Method",
      "Dynamic Modeling",
      "Control System Design"
    ],
    "Text Books/References": [
      "Robotics: Modelling, Planning and Control",
      "Introduction to Robotics by Craig",
      "Robot Analysis and Control by Asada",
      "Modern Robotics by Lynch",
      "Research Papers and Journals"
    ]
  }
};

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

