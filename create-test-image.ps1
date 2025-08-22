Add-Type -AssemblyName System.Drawing

# Create a 200x100 pixel bitmap
$bitmap = New-Object System.Drawing.Bitmap(200, 100)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Fill with light blue background
$graphics.Clear([System.Drawing.Color]::LightBlue)

# Add some text
$font = New-Object System.Drawing.Font("Arial", 16)
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::DarkBlue)
$graphics.DrawString("TEST IMAGE", $font, $brush, 50, 35)

# Clean up graphics
$graphics.Dispose()

# Save the image
$bitmap.Save("C:\Users\shubham\Desktop\Dev\Book-creator\test-image.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

Write-Host "Test image created at: C:\Users\shubham\Desktop\Dev\Book-creator\test-image.png"
