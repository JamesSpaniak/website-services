import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from 'typeorm';

/**
 * Normalized index of the course unit tree.
 *
 * The authoring source of truth remains `courses.payload` (JSON blob); this
 * table is derived from it and rebuilt transactionally on every course save.
 * It gives questions, exams, and progress a stable string ref to link against
 * instead of parsing the payload or doing digit arithmetic on numeric ids.
 *
 * Refs are opaque strings, unique within a course. Legacy numeric payload ids
 * are normalized to `u{n}` (e.g. 101 → "u101"); newly authored units may use
 * any unique string (the course editor generates UUIDs).
 */
@Entity('course_units')
@Unique(['course_id', 'ref'])
@Index(['course_id', 'parent_ref'])
export class CourseUnit {
  @PrimaryGeneratedColumn()
  id: number;

  /** FK to courses.id (ON DELETE CASCADE, enforced in the migration). */
  @Index()
  @Column({ type: 'int' })
  course_id: number;

  /** Stable, position-independent identifier within the course. */
  @Column({ type: 'varchar', length: 64 })
  ref: string;

  /** Ref of the parent node; null for top-level units. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  parent_ref: string | null;

  /**
   * The numeric id this node had in pre-migration payloads (e.g. 101).
   * Used to backfill question/exam links; null for units authored after
   * the string-ref migration.
   */
  @Column({ type: 'int', nullable: true })
  legacy_id: number | null;

  /** Materialized ancestor path, e.g. "u1/u13/u131". Root segment = owning unit. */
  @Column({ type: 'varchar', length: 255 })
  path: string;

  /** 0 for top-level units, 1 for sections, 2+ for nested lessons. */
  @Column({ type: 'smallint' })
  depth: number;

  /** Display order among siblings. */
  @Column({ type: 'smallint' })
  position: number;

  @Column({ type: 'varchar', length: 512 })
  title: string;
}
