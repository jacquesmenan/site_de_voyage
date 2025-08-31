const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Un forfait doit avoir un nom'],
      unique: true,
      trim: true,
      maxlength: [100, 'Un nom de forfait ne peut pas dépasser 100 caractères'],
      minlength: [10, 'Un nom de forfait doit avoir au moins 10 caractères']
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'Un forfait doit avoir une durée']
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'Un forfait doit avoir une taille de groupe']
    },
    difficulty: {
      type: String,
      required: [true, 'Un forfait doit avoir une difficulté'],
      enum: {
        values: ['facile', 'moyen', 'difficile'],
        message: 'La difficulté doit être: facile, moyen ou difficile'
      }
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'La note doit être supérieure à 1.0'],
      max: [5, 'La note doit être inférieure à 5.0']
    },
    ratingsQuantity: {
      type: Number,
      default: 0
    },
    price: {
      type: Number,
      required: [true, 'Un forfait doit avoir un prix']
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function(val) {
          // Ne fonctionne que lors de la création d'un nouveau document
          return val < this.price;
        },
        message: 'La réduction ({VALUE}) doit être inférieure au prix régulier'
      }
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'Un forfait doit avoir une description']
    },
    description: {
      type: String,
      trim: true
    },
    imageCover: {
      type: String,
      required: [true, 'Un forfait doit avoir une image de couverture']
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],
    // Référence aux guides (utilisateurs)
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index pour améliorer les performances des requêtes
// tourSchema.index({ price: 1 });
// tourSchema.index({ slug: 1 });
// tourSchema.index({ startLocation: '2dsphere' });

// Virtual populate des avis
// tourSchema.virtual('reviews', {
//   ref: 'Review',
//   foreignField: 'tour',
//   localField: '_id'
// });

// DOCUMENT MIDDLEWARE: s'exécute avant .save() et .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// QUERY MIDDLEWARE
// tourSchema.pre(/^find/, function(next) {
//   this.find({ secretTour: { $ne: true } });
//   next();
// });

// AGGREGATION MIDDLEWARE
// tourSchema.pre('aggregate', function(next) {
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
