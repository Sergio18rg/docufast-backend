const ROUTES = {
  public: {
    home: "/",
    about: "/about",
    contact: "/contact",
    login: "/login",
  },
  private: {
    dashboard: "/dashboard",
    profile: "/profile",
    workers: "/workers",
    vehicles: "/vehicles",
    clients: "/clients",
  },
} as const;

export { ROUTES };
