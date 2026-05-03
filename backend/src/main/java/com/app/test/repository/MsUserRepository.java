package com.app.test.repository;

import com.app.test.model.MsUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
@EnableJpaRepositories
public interface MsUserRepository extends JpaRepository<MsUser, Long> {

    boolean existsByUserName(String userName);

    boolean existsByUserNameIgnoreCaseAndRecordStatus(String userName, Character recordStatus);

    boolean existsByUserNameIgnoreCaseAndUserIdNotAndRecordStatus(String userName, Long userId, Character recordStatus);

    @Query("SELECT u FROM MsUser u " +
            "WHERE u.recordStatus = :recordStatus " +
            "AND (:keyword IS NULL OR :keyword = '' " +
            "OR LOWER(u.userName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(u.userFullName) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(u.email) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(u.phone) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(u.website) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<MsUser> searchActiveUsers(
            @Param("keyword") String keyword,
            @Param("recordStatus") Character recordStatus,
            Pageable pageable
    );

    Page<MsUser> findByRecordStatus(Character recordStatus, Pageable pageable);

    @Query("SELECT u FROM MsUser u " +
            "WHERE (u.recordStatus = :recordStatus OR u.recordStatus IS NULL) " +
            "AND LOWER(u.userName) = LOWER(:userName)")
    Optional<MsUser> findLoginUserByUserName(
            @Param("userName") String userName,
            @Param("recordStatus") Character recordStatus
    );

    @Query("SELECT u FROM MsUser u " +
            "WHERE (u.recordStatus = :recordStatus OR u.recordStatus IS NULL) " +
            "AND LOWER(u.email) = LOWER(:email)")
    Optional<MsUser> findLoginUserByEmail(
            @Param("email") String email,
            @Param("recordStatus") Character recordStatus
    );
}
