import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  excerpt: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  featuredImage: {
    type: String,
    default: ''
  },
  // SEO Fields
  metaTitle: {
    type: String,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    maxlength: 160
  },
  metaKeywords: {
    type: [String],
    default: []
  },
  // Engagement
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: String // Store user IDs or session IDs
  }],
  views: {
    type: Number,
    default: 0
  },
  // Publishing
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  author: {
    type: String,
    default: 'The Quisine Team'
  },
  category: {
    type: String,
    enum: ['bulk food', 'catering', 'Food', 'Thali', 'snack box', 'meals'],
    default: 'Food'
  },
  tags: [{
    type: String
  }],
  // Schema.org structured data
  readTime: {
    type: Number, // in minutes
    default: 5
  }
}, {
  timestamps: true
});

// Index for better query performance
blogSchema.index({ slug: 1 });
blogSchema.index({ isPublished: 1, publishedAt: -1 });
blogSchema.index({ category: 1 });
blogSchema.index({ tags: 1 });

// Generate slug from title
blogSchema.pre('validate', function(next) {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
  next();
});

// Set publishedAt date when publishing
blogSchema.pre('save', function(next) {
  if (this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  if (!this.isPublished) {
    this.publishedAt = null;
  }
  next();
});

// Auto-generate meta fields if not provided
blogSchema.pre('save', function(next) {
  if (!this.metaTitle) {
    this.metaTitle = this.title.substring(0, 60);
  }
  if (!this.metaDescription) {
    this.metaDescription = this.excerpt.substring(0, 160);
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;
