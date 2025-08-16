// Subject book cover images
import ApplicationOfSoftComputing from './application-of-soft-computing.png';
import DatabaseManagementSystem from './database-management-system.png';
import DesignAndAnalysisOfAlgorithm from './design-and-analysis-of-algorithm.png';
import MechanicsOfRobots from './mechanics-of-robots.png';
import ObjectOrientedSystemDesignWithCpp from './object-oriented-system-design-with-cpp.png';
import WebTechnology from './web-technology.png';
import SearchIcon from './search.png';

// Image mapping for easy access
export const bookImages = {
  'Object Oriented System Design with C++': ObjectOrientedSystemDesignWithCpp,
  'Application of Soft Computing': ApplicationOfSoftComputing,
  'Database Management System': DatabaseManagementSystem,
  'Web Technology': WebTechnology,
  'Design and Analysis of Algorithm': DesignAndAnalysisOfAlgorithm,
  'Mechanics of Robots': MechanicsOfRobots,
};

// Function to get book image by title
export const getBookImage = (title: string): string => {
  return bookImages[title as keyof typeof bookImages] || '';
};

// Export search icon
export { SearchIcon };
