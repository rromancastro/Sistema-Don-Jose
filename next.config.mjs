/** @type {import('next').NextConfig} */
const nextConfig = {
  redirects() {
    return [{ source: "/presupuestos", destination: "/cotizaciones", permanent: true }];
  },
};

export default nextConfig;
