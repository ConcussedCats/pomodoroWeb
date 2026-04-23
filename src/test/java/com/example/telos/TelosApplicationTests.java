package com.example.telos;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import com.example.telos.repository.LogErrorRepository;
import com.example.telos.repository.NoteRepository;
import com.example.telos.repository.ToDoRepository;
import com.example.telos.repository.UserRepository;
import com.example.telos.repository.UserTimeSettingsRepository;

@SpringBootTest(properties = {
        "spring.autoconfigure.exclude="
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration,"
                + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration"
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

	@Test
	void contextLoads() {
	}

}
