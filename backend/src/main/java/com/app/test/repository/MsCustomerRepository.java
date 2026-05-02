package com.app.test.repository;

import com.app.test.model.MsCustomer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

@Repository
@EnableJpaRepositories

public interface MsCustomerRepository extends JpaRepository<MsCustomer, Integer> {

    boolean existsByCustomerName(String customerName);

    Page<MsCustomer> findByCustomerNameContainingIgnoreCaseAndRecordStatus(
            String customerName,
            Character recordStatus,
            Pageable pageable
    );

    Page<MsCustomer> findByRecordStatus(Character recordStatus, Pageable pageable);
}