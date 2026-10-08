import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import "./CourseCard.css";

export default function CourseCard({ course }) {
  return (
    <article className="course-card">
      <div className="course-card-icon">
        <BookOpen size={20} aria-hidden="true" />
      </div>

      <div className="course-card-body">
        <h3 className="course-card-title">{course.title}</h3>
        <p className="course-card-instructor">{course.instructor}</p>
        <ProgressBar value={course.progress} label={`${course.title} progress`} />
      </div>

      <Link to={`/dashboard/courses/${course.id}`} className="course-card-btn">
        Continue
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </article>
  );
}
