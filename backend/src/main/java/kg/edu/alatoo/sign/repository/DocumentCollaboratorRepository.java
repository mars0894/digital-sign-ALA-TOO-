package kg.edu.alatoo.sign.repository;

import kg.edu.alatoo.sign.entity.DocumentCollaborator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentCollaboratorRepository extends JpaRepository<DocumentCollaborator, UUID> {
    
    List<DocumentCollaborator> findByDocumentId(UUID documentId);
    
    List<DocumentCollaborator> findByUserId(UUID userId);
    
    Optional<DocumentCollaborator> findByDocumentIdAndUserId(UUID documentId, UUID userId);
    
    void deleteByDocumentIdAndUserId(UUID documentId, UUID userId);
}
