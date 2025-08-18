# Bookshelf Backend Infrastructure Plan

## Overview
Full-stack backend system to support user authentication, book module management, progress tracking, and marketplace functionality.

## Technology Stack

### Backend Runtime
- **Node.js with Express** or **Fastify** for high performance
- **TypeScript** for type safety and consistency with frontend
- **Prisma** or **TypeORM** for database ORM

### Database Strategy
- **Primary Database**: PostgreSQL for structured data (users, progress, metadata)
- **Document Storage**: MongoDB or PostgreSQL JSON columns for flexible book content
- **Cache Layer**: Redis for session management and performance optimization

### Authentication
- **Firebase Authentication** (recommended for quick implementation)
- Alternative: **Auth0** or custom **JWT-based system**
- **Role-based access control** (Student, Educator, Admin)

### File Storage
- **AWS S3** or **Cloudinary** for multimedia assets
- **CDN integration** for global content delivery
- **Image optimization** and automatic format conversion

### API Design
- **RESTful APIs** with **OpenAPI/Swagger** documentation
- **GraphQL** consideration for complex data relationships
- **Rate limiting** and **API versioning**

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  role user_role DEFAULT 'student',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  preferences JSONB DEFAULT '{}'
);

CREATE TYPE user_role AS ENUM ('student', 'educator', 'admin');
```

### Book Modules Table
```sql
CREATE TABLE book_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  author_id UUID REFERENCES users(id),
  curriculum VARCHAR(100),
  description TEXT,
  content JSONB NOT NULL, -- Full book module data
  version VARCHAR(20) DEFAULT '1.0.0',
  status module_status DEFAULT 'draft',
  visibility module_visibility DEFAULT 'private',
  tags TEXT[],
  difficulty difficulty_level DEFAULT 'intermediate',
  estimated_hours INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE module_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE module_visibility AS ENUM ('private', 'public', 'unlisted');
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');
```

### User Progress Table
```sql
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  book_module_id UUID REFERENCES book_modules(id),
  chapter_id VARCHAR(255),
  progress_percentage INTEGER DEFAULT 0,
  time_spent INTEGER DEFAULT 0, -- in minutes
  last_accessed TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  notes TEXT,
  UNIQUE(user_id, book_module_id, chapter_id)
);
```

### Highlights Table
```sql
CREATE TABLE highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  book_module_id UUID REFERENCES book_modules(id),
  chapter_id VARCHAR(255),
  text_content TEXT NOT NULL,
  highlight_color VARCHAR(50) DEFAULT 'yellow',
  position_start INTEGER,
  position_end INTEGER,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Marketplace Reviews
```sql
CREATE TABLE module_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  book_module_id UUID REFERENCES book_modules(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, book_module_id)
);
```

## API Endpoints Structure

### Authentication Endpoints
```
POST /api/auth/register
POST /api/auth/login  
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/profile
PUT  /api/auth/profile
```

### Book Module Endpoints
```
GET    /api/books                    # List all public books
POST   /api/books                    # Create new book (educators)
GET    /api/books/:id                # Get specific book
PUT    /api/books/:id                # Update book (author only)
DELETE /api/books/:id                # Delete book (author only)
GET    /api/books/search             # Search books
GET    /api/books/categories         # Get curriculum categories
```

### User Progress Endpoints
```
GET    /api/progress                 # Get user's progress across all books
GET    /api/progress/:bookId         # Get progress for specific book
POST   /api/progress/:bookId         # Update progress
GET    /api/highlights               # Get user's highlights
POST   /api/highlights               # Create highlight
PUT    /api/highlights/:id           # Update highlight
DELETE /api/highlights/:id           # Delete highlight
```

### Marketplace Endpoints
```
GET    /api/marketplace              # Browse marketplace
GET    /api/marketplace/featured     # Featured books
GET    /api/marketplace/:id/reviews  # Get book reviews
POST   /api/marketplace/:id/reviews  # Add review
POST   /api/marketplace/:id/download # Download book module
```

## Deployment Strategy

### Development Environment
```bash
# Local development with Docker Compose
docker-compose up -d  # Database, Redis, MinIO (S3 alternative)
npm run dev          # Start API server with hot reload
```

### Production Deployment Options

#### Option 1: Railway/Render (Recommended for MVP)
- **Database**: Railway PostgreSQL or Render PostgreSQL
- **API Server**: Railway or Render Node.js deployment
- **File Storage**: AWS S3 or Cloudinary
- **Cost**: ~$20-50/month for MVP

#### Option 2: AWS/GCP (Scalable)
- **Database**: AWS RDS or Google Cloud SQL
- **API Server**: AWS ECS/Fargate or Google Cloud Run
- **File Storage**: AWS S3 or Google Cloud Storage
- **CDN**: CloudFront or Google Cloud CDN
- **Cost**: ~$50-200/month depending on usage

#### Option 3: Self-Hosted (Cost-effective)
- **VPS**: DigitalOcean, Linode, or Vultr
- **Database**: Self-hosted PostgreSQL
- **File Storage**: Self-hosted MinIO or external service
- **Cost**: ~$10-30/month

## Security Considerations

### Data Protection
- **Encryption at rest** for sensitive data
- **HTTPS/TLS** for all communications
- **Input validation** and **SQL injection prevention**
- **Rate limiting** to prevent abuse

### User Privacy
- **GDPR compliance** for European users
- **Data anonymization** for analytics
- **Secure file upload** with virus scanning
- **Content moderation** for marketplace

### API Security
- **JWT token expiration** and refresh mechanism
- **API key management** for third-party integrations
- **CORS configuration** for frontend domains
- **Request logging** and monitoring

## Performance Optimization

### Database
- **Indexing strategy** for frequent queries
- **Connection pooling** for better resource management
- **Read replicas** for scaling read operations
- **Query optimization** and monitoring

### Caching Strategy
- **Redis caching** for frequently accessed data
- **CDN caching** for static assets
- **Application-level caching** for computed results
- **Cache invalidation** strategies

### Monitoring and Analytics
- **Application monitoring** with tools like New Relic or DataDog
- **Database performance monitoring**
- **User analytics** for product insights
- **Error tracking** with Sentry or similar

## Implementation Timeline

### Week 7: Foundation
- Set up development environment
- Database schema implementation
- Basic authentication system
- API structure and documentation

### Week 8: Core APIs
- User management endpoints
- Book module CRUD operations
- File upload and storage system
- Basic progress tracking

### Week 9: Advanced Features
- Search and filtering functionality
- Marketplace endpoints
- Review and rating system
- User dashboard APIs

### Week 10: Integration & Testing
- Frontend integration
- API testing and documentation
- Performance optimization
- Security audit and fixes

This backend infrastructure will provide a solid foundation for all the advanced features you want to implement!
