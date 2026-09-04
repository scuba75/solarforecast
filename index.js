process.on('unhandledRejection', (error) => {
  console.error(`[unhandledRejection]`)
  console.log(error)
});
import './src/index.js'
