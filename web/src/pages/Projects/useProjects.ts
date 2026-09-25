import { countLabel } from "../../utils/countLabel";
import { projectTechnicalTerms } from "../../utils/technicalCoverage";
import { useMemo, useReducer, useCallback } from "react";
import { projectsData, STATUSES } from "../../data/projects";

// Define explicit types for better type safety
type SortByType = "date" | "name" | "category";
type FilterableKeys = "category" | "status";

// State interface for better type safety
interface ProjectsState {
  category: string;
  status: string;
  sortBy: SortByType;
}

// Action types for useReducer
type ProjectsAction =
  | {
      type: "SET_FILTER";
      payload: {
        filterName: FilterableKeys;
        value: string;
      };
    }
  | { type: "SET_SORT"; payload: SortByType }
  | { type: "RESET_FILTERS" }
  | {
      type: "APPLY_QUICK_FILTER";
      payload: {
        filterName: FilterableKeys;
        value: string;
      };
    };

// 1. Define the base filter state first. This is the "source of truth" for filters.
const initialFilterState = {
  category: "All" as const,
  status: "All" as const,
};

// 2. Compose the full initial state from the filter state and other properties.
const initialState: ProjectsState = {
  ...initialFilterState,
  sortBy: "date",
};

// Sort options constant to avoid repetition
const SORT_OPTIONS = [
  { value: "date" as const, label: "Date (Newest)" },
  { value: "name" as const, label: "Name" },
  { value: "category" as const, label: "Category" },
] as const;

// Reducer function with exhaustive type checking
function projectsReducer(
  state: ProjectsState,
  action: ProjectsAction
): ProjectsState {
  switch (action.type) {
    case "SET_FILTER":
      return { ...state, [action.payload.filterName]: action.payload.value };
    case "SET_SORT":
      return { ...state, sortBy: action.payload };
    case "RESET_FILTERS":
      return { ...state, ...initialFilterState };
    case "APPLY_QUICK_FILTER":
      // Reset all filters first, then apply the specific filter
      return {
        ...state,
        ...initialFilterState, // Reset all filters...
        [action.payload.filterName]: action.payload.value, // ...then apply the new one
      };
    default: {
      // Exhaustive type checking
      const _exhaustiveCheck: never = action;
      throw new Error(`Unhandled action type: ${_exhaustiveCheck}`);
    }
  }
}

export function useProjects() {
  const [state, dispatch] = useReducer(projectsReducer, initialState);
  const { category, status, sortBy } = state;

  // Get unique categories and statuses
  const categories = useMemo(() => {
    const cats = [...new Set(projectsData.map((p) => p.category))];
    return ["All", ...cats];
  }, []);

  const statuses = useMemo(() => {
    return ["All", ...STATUSES];
  }, []);

  // Get all unique technologies
  const allTechnologies = useMemo(() => {
    const techSet = new Set<string>();
    projectsData.forEach((project) => {
      projectTechnicalTerms(project.techStack).forEach((tech) => techSet.add(tech));
    });
    return Array.from(techSet).sort();
  }, []);

  // Memoize stat card calculations
  const liveProjectCount = useMemo(
    () => projectsData.filter((p) => p.status === "Live").length,
    []
  );

  // Pre-calculate technology counts for efficient lookup
  const techProjectCounts = useMemo(() => {
    const counts = new Map<string, number>();
    // Iterate through the projects ONCE to build the count map
    projectsData.forEach((project) => {
      projectTechnicalTerms(project.techStack).forEach((tech) => {
        counts.set(tech, (counts.get(tech) || 0) + 1);
      });
    });
    return counts;
  }, []); // Empty dependency array as projectsData is static

  // Filter and sort projects - fixed array mutation issue
  const filteredAndSortedProjects = useMemo(() => {
    const filtered = projectsData.filter((project) => {
      const categoryMatch = category === "All" || project.category === category;
      const statusMatch = status === "All" || project.status === status;
      return categoryMatch && statusMatch;
    });

    // Create a new sorted array instead of mutating
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "name":
          return a.title.localeCompare(b.title);
        case "category":
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });
  }, [category, status, sortBy]);

  // Event handlers using useCallback for performance
  const handleFilterChange = useCallback(
    (filterName: FilterableKeys, value: string) => {
      dispatch({ type: "SET_FILTER", payload: { filterName, value } });
    },
    []
  );

  const handleSortChange = useCallback((value: SortByType) => {
    dispatch({ type: "SET_SORT", payload: value });
  }, []);

  const handleShowAllProjects = useCallback(() => {
    dispatch({ type: "RESET_FILTERS" });
  }, []);

  const handleShowLiveProjects = useCallback(() => {
    dispatch({
      type: "APPLY_QUICK_FILTER",
      payload: { filterName: "status", value: "Live" },
    });
  }, []);

  // Perfecting the accessibility experience with more descriptive announcements
  const projectCount = filteredAndSortedProjects.length;
  const projectsFoundMessage =
    projectCount > 0
      ? `${countLabel(projectCount, "project")} found.`
      : "No projects found matching your criteria.";

  return {
    // Grouped state for better organization
    state: { category, status, sortBy },

    // Grouped data for derived values
    data: {
      filteredAndSortedProjects,
      categories,
      statuses,
      allTechnologies,
    },

    // Grouped statistics
    stats: {
      liveProjectCount,
      techProjectCounts,
    },

    // Grouped event handlers
    handlers: {
      handleFilterChange,
      handleSortChange,
      handleShowAllProjects,
      handleShowLiveProjects,
    },

    // Accessibility and constants
    projectsFoundMessage,
    SORT_OPTIONS,
  };
}
