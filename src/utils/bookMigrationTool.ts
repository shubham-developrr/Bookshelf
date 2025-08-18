import { BookModule } from '../types/bookModule';
import { bookLoader } from './bookModuleLoader';

/**
 * Migration utility to convert existing hardcoded books to the new module format
 */
export class BookMigrationTool {
  
  /**
   * Convert existing hardcoded book structure to new BookModule format
   */
  migrateExistingBooks(): BookModule[] {
    const existingBooks = [
      // Object Oriented System Design with C++
      {
        id: 'oo-design-cpp',
        title: 'Object Oriented System Design with C++',
        author: 'Educational Team',
        curriculum: 'Computer Science',
        description: 'Comprehensive guide to Object-Oriented Programming and System Design using C++',
        subjects: [
          {
            id: 'introduction',
            title: 'Introduction',
            description: 'Fundamentals of Object-Oriented Design',
            units: [
              {
                id: 'unit-1',
                title: 'Unit 1: Introduction to OOP',
                description: 'Basic concepts and principles',
                chapters: [
                  {
                    id: 'intro-chapter',
                    title: 'Introduction to Object-Oriented Programming',
                    content: `# Introduction to Object-Oriented Programming

Object-oriented programming (OOP) is a programming paradigm that uses "objects" to design applications and computer programs. It utilizes several key concepts including encapsulation, inheritance, and polymorphism.

## Key Concepts

### Encapsulation
Encapsulation is the bundling of data and methods that operate on that data within a single unit or object. It restricts direct access to some of an object's components, which is a means of preventing accidental interference and misuse.

### Inheritance
Inheritance allows a class to inherit properties and methods from another class. This promotes code reusability and establishes a relationship between parent and child classes.

### Polymorphism
Polymorphism allows objects of different types to be treated as objects of a common base type. It enables a single interface to represent different underlying forms (data types).

## Benefits of OOP

1. **Modularity**: Code is organized into discrete objects
2. **Reusability**: Objects can be reused across programs
3. **Scalability**: Easy to add new features and objects
4. **Maintainability**: Easier to debug and maintain

## Example in C++

\`\`\`cpp
class Animal {
private:
    string name;
    int age;

public:
    Animal(string n, int a) : name(n), age(a) {}
    
    virtual void makeSound() {
        cout << "Some generic animal sound" << endl;
    }
    
    void displayInfo() {
        cout << "Name: " << name << ", Age: " << age << endl;
    }
};

class Dog : public Animal {
public:
    Dog(string n, int a) : Animal(n, a) {}
    
    void makeSound() override {
        cout << "Woof! Woof!" << endl;
    }
};
\`\`\`

This example demonstrates inheritance, encapsulation, and polymorphism in C++.`,
                    media: [],
                    subtopics: [
                      {
                        id: 'oop-fundamentals',
                        title: 'OOP Fundamentals',
                        content: 'Object-Oriented Programming is a programming paradigm that uses objects to design and organize code.',
                        media: []
                      },
                      {
                        id: 'classes-objects',
                        title: 'Classes and Objects',
                        content: 'Classes are blueprints for creating objects. Objects are instances of classes that contain data and methods.',
                        media: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      },

      // Design and Analysis of Algorithms
      {
        id: 'design-analysis-algorithms',
        title: 'Design and Analysis of Algorithm',
        author: 'Algorithm Experts',
        curriculum: 'Computer Science',
        description: 'Comprehensive study of algorithm design techniques and complexity analysis',
        subjects: [
          {
            id: 'dynamic-programming',
            title: 'Unit 5 Dynamic Programming',
            description: 'Advanced algorithmic technique for optimization problems',
            units: [
              {
                id: 'unit-5',
                title: 'Dynamic Programming Fundamentals',
                description: 'Core concepts and applications',
                chapters: [
                  {
                    id: 'dp-intro',
                    title: 'Introduction to Dynamic Programming',
                    content: `# Dynamic Programming

Dynamic Programming is an algorithmic paradigm that solves complex problems by breaking them down into simpler subproblems and storing the results of subproblems to avoid computing the same results again.

## Key Characteristics

1. **Overlapping Subproblems**: The same subproblems are solved multiple times
2. **Optimal Substructure**: An optimal solution can be constructed from optimal solutions of its subproblems

## Classic Problems

### 0/1 Knapsack Problem
Given a set of items, each with a weight and value, determine the number of each item to include in a collection so that the total weight is less than or equal to a given limit and the total value is as large as possible.

**Mathematical Formulation:**
$$\\text{maximize } \\sum_{i=1}^{n} v_i x_i$$
$$\\text{subject to } \\sum_{i=1}^{n} w_i x_i \\leq W$$
$$x_i \\in \\{0, 1\\}$$

### Fibonacci Sequence
The classic example of dynamic programming optimization.

\`\`\`cpp
// Naive recursive approach - O(2^n)
int fibonacciNaive(int n) {
    if (n <= 1) return n;
    return fibonacciNaive(n-1) + fibonacciNaive(n-2);
}

// Dynamic programming approach - O(n)
int fibonacciDP(int n) {
    if (n <= 1) return n;
    
    vector<int> dp(n + 1);
    dp[0] = 0;
    dp[1] = 1;
    
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i-1] + dp[i-2];
    }
    
    return dp[n];
}
\`\`\`

## Time Complexity Analysis

Dynamic programming typically transforms exponential time algorithms into polynomial time algorithms through memoization or tabulation.`,
                    media: [],
                    subtopics: [
                      {
                        id: 'knapsack-problem',
                        title: '0/1 Knapsack Problem',
                        content: 'Classic optimization problem solved using dynamic programming techniques.',
                        media: []
                      },
                      {
                        id: 'fibonacci-optimization',
                        title: 'Fibonacci Optimization',
                        content: 'Transforming exponential recursive solution to linear time using memoization.',
                        media: []
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ];

    // Convert to new format and load into system
    const migratedBooks: BookModule[] = existingBooks.map(book => {
      const bookModule = bookLoader.convertLegacyBook(book);
      return bookModule;
    });

    // Validate and save migrated books
    migratedBooks.forEach(book => {
      try {
        bookLoader.loadBookModule(book);
        console.log(`✅ Migrated book: ${book.title}`);
      } catch (error) {
        console.error(`❌ Failed to migrate book: ${book.title}`, error);
      }
    });

    return migratedBooks;
  }

  /**
   * Export book modules to files for backup/distribution
   */
  exportBookModules(books: BookModule[]): { [bookId: string]: string } {
    const exports: { [bookId: string]: string } = {};
    
    books.forEach(book => {
      exports[book.id] = JSON.stringify(book, null, 2);
    });
    
    return exports;
  }

  /**
   * Create downloadable book module files
   */
  createDownloadableBook(book: BookModule): void {
    const dataStr = JSON.stringify(book, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${book.id}-v${book.version}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
}

export const migrationTool = new BookMigrationTool();
