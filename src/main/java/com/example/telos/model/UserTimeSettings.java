package com.example.telos.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@NoArgsConstructor
@Getter
@ToString
@Entity
@Table(name = "user_time_settings")
public class UserTimeSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "settings_id", unique = true, nullable = false)
    private Long settingsId;

    @ToString.Exclude
    @OneToOne
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    private User user;

    @Setter
    @Column(name="pomodoro_minutes", nullable = false)
    private Integer pomodoroMinutes;

    @Setter
    @Column(name="short_break_minutes", nullable = false)
    private Integer shortBreakMinutes;

    @Setter
    @Column(name="long_break_minutes", nullable = false)
    private Integer longBreakMinutes;

    @Setter
    @Column(name="pomo_cycles", nullable = false)
    private Integer pomoCycles;

    @Setter
    @Column(name = "sounds_enable", nullable = false)
    private Boolean soundsEnable;
}
