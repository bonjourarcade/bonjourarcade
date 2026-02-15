import http.server
import socketserver
import os
import sys

class RedirectHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # First, try to serve the file normally
        path = self.translate_path(self.path)
        
        # If the path is a directory, SimpleHTTPRequestHandler will handle it (index.html)
        if os.path.isdir(path):
            return super().do_GET()
            
        # If the file doesn't exist, decide whether to serve 404.html
        if not os.path.exists(path):
            # Strip query parameters for extension/route checking
            clean_path = self.path.split('?')[0]
            
            # We ONLY want to serve 404.html for routes, not for missing assets
            # 1. Paths starting with /b/ (our custom game routes)
            # 2. Paths without an extension (clean URL routes)
            
            is_b_route = clean_path.startswith('/b/')
            has_extension = '.' in os.path.basename(clean_path)
            
            # Directories that definitely shouldn't trigger a 404.html redirect
            asset_dirs = ['/assets/', '/games/', '/config/', '/data/', '/roms/', '/api/']
            is_asset_path = any(clean_path.startswith(d) for d in asset_dirs)
            
            if (is_b_route or not has_extension) and not is_asset_path:
                print(f"Route not found: {self.path}. Serving 404.html for client-side routing.")
                self.path = "/404.html"
            else:
                # For images, JSON, etc. that are missing, return a real 404
                # super().do_GET will call self.send_error(404)
                return super().do_GET()
            
        return super().do_GET()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    
    # Ensure we are in the public directory if it exists
    if os.path.exists("public"):
        os.chdir("public")
    
    Handler = RedirectHandler
    
    # Allow address reuse to avoid "Address already in use" errors during development
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"Serving BonjourArcade at http://localhost:{port}")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped by user")
            sys.exit(0)
