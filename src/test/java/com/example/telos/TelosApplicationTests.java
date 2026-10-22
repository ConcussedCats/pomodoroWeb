package com.example.telos;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import com.example.telos.repository.LogErrorRepository;
import com.example.telos.repository.NoteRepository;
import com.example.telos.repository.ToDoRepository;
import com.example.telos.repository.UserRepository;
import com.example.telos.repository.UserTimeSettingsRepository;
import com.example.telos.repository.PomodoroSessionRepository;
import com.example.telos.repository.device.DeviceCommandRepository;
import com.example.telos.repository.device.DeviceEventRepository;
import com.example.telos.repository.device.DevicePairingRepository;
import com.example.telos.repository.device.DeviceRepository;
import com.example.telos.repository.device.DeviceSettingsRepository;
import com.example.telos.repository.device.DeviceTimerStateRepository;

@SpringBootTest(properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration",
        "telos.device.scheduling-enabled=false"
})
class TelosApplicationTests {

    @MockBean
    private UserRepository userRepository;

    @MockBean
    private UserTimeSettingsRepository userTimeSettingsRepository;

    @MockBean
    private LogErrorRepository logErrorRepository;

    @MockBean
    private ToDoRepository toDoRepository;

    @MockBean
    private NoteRepository noteRepository;

    @MockBean
    private DeviceRepository deviceRepository;

    @MockBean
    private DevicePairingRepository devicePairingRepository;

    @MockBean
    private DeviceSettingsRepository deviceSettingsRepository;

    @MockBean
    private DeviceTimerStateRepository deviceTimerStateRepository;

    @MockBean
    private DeviceCommandRepository deviceCommandRepository;

    @MockBean
    private DeviceEventRepository deviceEventRepository;

    @MockBean
    private PomodoroSessionRepository pomodoroSessionRepository;

	@Test
	void contextLoads() {
	}

}
