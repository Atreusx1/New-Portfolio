const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const webp = require('webp-converter');

// Set up webp-converter
webp.grant_permission();

// Define the media directory
const mediaDir = path.join(__dirname, '..', 'build', 'static', 'media');

// Find all .webp files
function findWebpFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      results = results.concat(findWebpFiles(itemPath));
    } else if (item.endsWith('.webp')) {
      results.push(itemPath);
    }
  }
  
  return results;
}

// Process each image
async function optimizeImages() {
  try {
    console.log('Starting image optimization...');
    const webpFiles = findWebpFiles(mediaDir);
    
    if (webpFiles.length === 0) {
      console.log('No WebP files found to optimize.');
      return;
    }
    
    console.log(`Found ${webpFiles.length} WebP files to optimize.`);
    
    for (const file of webpFiles) {
      const tempFile = `${file}.tmp`;
      
      try {
        // Optimize the image
        await webp.cwebp(file, tempFile, "-q 85");
        
        // Replace the original with the optimized version
        fs.unlinkSync(file);
        fs.renameSync(tempFile, file);
        
        console.log(`Optimized: ${path.basename(file)}`);
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
        // Clean up temp file if it exists
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    }
    
    console.log('Image optimization completed.');
  } catch (err) {
    console.error('Error during image optimization:', err);
    process.exit(1);
  }
}

// Run the optimization
optimizeImages();