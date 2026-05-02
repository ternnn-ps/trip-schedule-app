package com.app.test.repository;

import com.app.test.model.MsTrip;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.stereotype.Repository;

@Repository
@EnableJpaRepositories
public interface MsTripRepository extends JpaRepository<MsTrip, String> {

    Page<MsTrip> findByRecordStatus(Character recordStatus, Pageable pageable);

    Page<MsTrip> findByNameContainingIgnoreCaseAndRecordStatusOrDestinationContainingIgnoreCaseAndRecordStatus(
            String name,
            Character nameRecordStatus,
            String destination,
            Character destinationRecordStatus,
            Pageable pageable
    );
}
