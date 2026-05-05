package com.app.test.repository;

import com.app.test.model.MsNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MsNotificationRepository extends JpaRepository<MsNotification, String> {

    List<MsNotification> findTop50ByRecipientUserNameIgnoreCaseAndRecordStatusOrderByCreatedDateDesc(
            String recipientUserName,
            Character recordStatus
    );

    List<MsNotification> findByRecipientUserNameIgnoreCaseAndReadFlagAndRecordStatus(
            String recipientUserName,
            Boolean readFlag,
            Character recordStatus
    );
}
